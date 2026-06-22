import "express-async-errors";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import helmet from "helmet";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { rateLimit } from "express-rate-limit";
import db, { databaseMode } from "./db.js";
import { config } from "./config.js";
import { optionalAuth, resolveUser } from "./auth.js";
import foundationRouter, { ensureFoundationSchema } from "./foundation.js";
import featuresRouter, { ensureFeaturesSchema, awardPoints } from "./features.js";
import {
  ensureReporter,
  findDuplicate,
  imageFingerprint,
  recordModeration,
  reporterIsSuspended,
  reporterKey,
} from "./moderation.js";
import { uploadImage } from "./upload-helper.js";

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>/g, "").trim();
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST"]
  }
});
app.set("io", io);

const liveRescuers = new Map();

function socketCaseRoom(kind, id) {
  return `case:${kind}:${id}`;
}

async function canAccessCaseLocation(user, kind, id) {
  if (!user || !Number.isSafeInteger(id) || !["rescue", "lost"].includes(kind)) return false;
  if (user.role === "admin") return true;
  if (kind === "rescue") {
    const report = await db("reports").where({ id }).select("userId", "assignedUserId").first();
    return Boolean(report && (report.userId === user.id || report.assignedUserId === user.id));
  }
  const post = await db("lost_posts").where({ id }).select("userId", "assignedUserId").first();
  return Boolean(post && (post.userId === user.id || post.assignedUserId === user.id));
}

async function canShareCaseLocation(user, kind, id) {
  if (!user || !Number.isSafeInteger(id) || !["rescue", "lost"].includes(kind)) return false;
  if (kind === "rescue") {
    const report = await db("reports").where({ id }).select("assignedUserId").first();
    return Boolean(report && report.assignedUserId === user.id);
  }
  const post = await db("lost_posts").where({ id }).select("assignedUserId").first();
  return Boolean(post && post.assignedUserId === user.id);
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("authenticate", async ({ token } = {}, ack) => {
    try {
      socket.data.user = token ? await resolveUser(token) : null;
      if (!socket.data.user) {
        ack?.({ ok: false, error: "Invalid session" });
        return;
      }
      ack?.({ ok: true, userId: socket.data.user.id });
    } catch {
      socket.data.user = null;
      ack?.({ ok: false, error: "Invalid session" });
    }
  });

  socket.on("join-case", async ({ kind, id } = {}, ack) => {
    const pinId = Number.parseInt(id, 10);
    try {
      if (!await canAccessCaseLocation(socket.data.user, kind, pinId)) {
        ack?.({ ok: false, error: "Not allowed to track this case" });
        return;
      }
      socket.join(socketCaseRoom(kind, pinId));
      ack?.({ ok: true });
    } catch {
      ack?.({ ok: false, error: "Unable to join case tracking" });
    }
  });

  socket.on("leave-case", ({ kind, id } = {}) => {
    const pinId = Number.parseInt(id, 10);
    if (Number.isSafeInteger(pinId) && ["rescue", "lost"].includes(kind)) {
      socket.leave(socketCaseRoom(kind, pinId));
    }
  });

  socket.on("update-location", async (data = {}) => {
    const user = socket.data.user;
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    const activeCase = data.activeCase || {};
    const pinId = Number.parseInt(activeCase.id, 10);
    const kind = activeCase.kind;
    if (!user || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const location = {
      userId: user.id,
      name: user.name,
      role: user.role,
      latitude,
      longitude,
      accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : null,
      updatedAt: new Date().toISOString(),
    };
    liveRescuers.set(socket.id, location);

    if (await canShareCaseLocation(user, kind, pinId)) {
      const caseLocation = { ...location, kind, id: pinId };
      io.to(socketCaseRoom(kind, pinId)).emit("case-location-updated", caseLocation);
      socket.broadcast.emit("location-updated", location);
      return;
    }

    socket.broadcast.emit("location-updated", location);
  });

  socket.on("stop-sharing", () => {
    const rescuer = liveRescuers.get(socket.id);
    if (rescuer) {
      liveRescuers.delete(socket.id);
      socket.broadcast.emit("rescuer-left", { userId: rescuer.userId });
      socket.rooms.forEach((room) => {
        if (room.startsWith("case:")) {
          io.to(room).emit("case-location-stopped", { userId: rescuer.userId });
        }
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const rescuer = liveRescuers.get(socket.id);
    if (rescuer) {
      liveRescuers.delete(socket.id);
      socket.broadcast.emit("rescuer-left", { userId: rescuer.userId });
    }
  });

  socket.emit("active-rescuers", Array.from(liveRescuers.values()));
});

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"));
  },
}));
app.use(express.json({ limit: config.jsonLimit }));
app.use("/uploads", express.static("./data/uploads"));
app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));
app.use(foundationRouter);
app.use(featuresRouter);

const uploadRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.uploadRateLimitMax,
  keyGenerator: reporterKey,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const reportRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.reportRateLimitMax,
  keyGenerator: reporterKey,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match || !allowedImageTypes.has(match[1])) return null;

  const bytes = Buffer.byteLength(match[2].replace(/\s/g, ""), "base64");
  if (!bytes || bytes > config.maxImageBytes) return null;
  return { dataUrl, bytes };
}

function validCoordinate(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validTags(tags) {
  return Array.isArray(tags)
    && tags.length > 0
    && tags.length <= 10
    && tags.every((tag) => typeof tag === "string" && tag.trim().length > 0 && tag.length <= 60);
}

function validOptionalText(value, max) {
  return value === undefined || value === null || (typeof value === "string" && value.trim().length <= max);
}

function validPhone(value) {
  return typeof value === "string" && /^[+\d\s().-]{7,30}$/.test(value.trim());
}

async function recordReportStatusEvent(trx, { reportId, status, note = "", changedBy = null }) {
  await trx("report_status_events").insert({
    reportId,
    status,
    note: stripHtml(note || ""),
    changedBy,
  });
}

async function ensureSchema() {
  const exists = await db.schema.hasTable("reports");
  if (!exists) {
    await db.schema.createTable("reports", (table) => {
      table.increments("id").primary();
      table.text("photoUrl").notNullable();
      table.float("latitude").notNullable();
      table.float("longitude").notNullable();
      table.text("tags").notNullable();
      table.text("notes").defaultTo("");
      table.string("status").notNullable().defaultTo("pending");
      table.string("reporterName", 100).defaultTo("");
      table.string("reporterPhone", 30).defaultTo("");
      table.string("reporterAltContact", 120).defaultTo("");
      table.boolean("contactConsent").notNullable().defaultTo(false);
      table.text("lastStatusNote").defaultTo("");
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  }

  const reportColumns = [
    ["reporterKey", (table) => table.string("reporterKey", 64)],
    ["imageFingerprint", (table) => table.string("imageFingerprint", 64)],
    ["duplicateOfReportId", (table) => table.integer("duplicateOfReportId")],
    ["reviewReason", (table) => table.text("reviewReason")],
    ["reviewedAt", (table) => table.timestamp("reviewedAt")],
    ["reporterName", (table) => table.string("reporterName", 100).defaultTo("")],
    ["reporterPhone", (table) => table.string("reporterPhone", 30).defaultTo("")],
    ["reporterAltContact", (table) => table.string("reporterAltContact", 120).defaultTo("")],
    ["contactConsent", (table) => table.boolean("contactConsent").notNullable().defaultTo(false)],
    ["lastStatusNote", (table) => table.text("lastStatusNote").defaultTo("")],
    ["updatedAt", (table) => table.timestamp("updatedAt").defaultTo(db.fn.now())],
  ];
  for (const [column, addColumn] of reportColumns) {
    if (!await db.schema.hasColumn("reports", column)) {
      await db.schema.alterTable("reports", addColumn);
    }
  }

  if (!await db.schema.hasTable("report_status_events")) {
    await db.schema.createTable("report_status_events", (table) => {
      table.increments("id").primary();
      table.integer("reportId").notNullable();
      table.string("status", 40).notNullable();
      table.text("note").defaultTo("");
      table.integer("changedBy");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("image_uploads")) {
    await db.schema.createTable("image_uploads", (table) => {
      table.increments("id").primary();
      table.text("photoUrl").notNullable().unique();
      table.string("imageFingerprint", 64).notNullable();
      table.string("reporterKey", 64).notNullable();
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("reporters")) {
    await db.schema.createTable("reporters", (table) => {
      table.string("reporterKey", 64).primary();
      table.integer("confirmedAbuseCount").notNullable().defaultTo(0);
      table.timestamp("suspendedAt");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("moderation_actions")) {
    await db.schema.createTable("moderation_actions", (table) => {
      table.increments("id").primary();
      table.integer("reportId").notNullable();
      table.string("action", 30).notNullable();
      table.string("shelterId", 100).notNullable();
      table.text("reason").notNullable();
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }
}

app.post("/upload", uploadRateLimit, optionalAuth, async (req, res) => {
  try {
    const key = reporterKey(req);
    await ensureReporter(key);
    if (await reporterIsSuspended(key)) {
      return res.status(403).json({ error: "Reporter suspended" });
    }

    const { dataUrl } = req.body || {};
    const image = parseImageDataUrl(dataUrl);
    if (!image) {
      return res.status(400).json({ error: "Image must be a JPEG, PNG, or WebP under 7 MB." });
    }

    const fingerprint = await imageFingerprint(image.dataUrl.split(",")[1]);
    const result = await uploadImage(image.dataUrl, "pawpin-reports");

    await db("image_uploads").insert({
      photoUrl: result.secure_url,
      imageFingerprint: fingerprint,
      reporterKey: key,
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload failed:", err.message);
    return res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "PawPin backend is running" });
});

app.post("/reports", reportRateLimit, optionalAuth, async (req, res) => {
  const {
    photoUrl,
    latitude,
    longitude,
    tags,
    notes,
    reporterName,
    reporterPhone,
    reporterAltContact,
    contactConsent,
  } = req.body;
  if (
    typeof photoUrl !== "string"
    || (!photoUrl.startsWith("https://") && !photoUrl.startsWith("http://"))
    || photoUrl.length > 2048
    || !validCoordinate(latitude, -90, 90)
    || !validCoordinate(longitude, -180, 180)
    || !validTags(tags)
    || (notes !== undefined && (typeof notes !== "string" || notes.length > 1000))
    || !validOptionalText(reporterName, 100)
    || !validPhone(reporterPhone)
    || !validOptionalText(reporterAltContact, 120)
    || contactConsent !== true
  ) {
    return res.status(400).json({ error: "Add valid contact details and report information" });
  }

  try {
    const key = reporterKey(req);
    await ensureReporter(key);
    if (await reporterIsSuspended(key)) {
      return res.status(403).json({ error: "Reporter suspended" });
    }

    const upload = await db("image_uploads").where({ photoUrl, reporterKey: key }).first();
    if (!upload) {
      return res.status(400).json({ error: "Photo must be uploaded by this reporter before creating a report" });
    }

    const duplicate = await findDuplicate(upload.imageFingerprint);
    const status = duplicate ? "review" : "pending";
    const reviewReason = duplicate
      ? `Possible duplicate of report ${duplicate.reportId} (distance ${duplicate.distance})`
      : null;

    const id = await db.transaction(async (trx) => {
      const [inserted] = await trx("reports").insert({
        photoUrl,
        latitude,
        longitude,
        tags: JSON.stringify(tags.map((tag) => tag.trim())),
        notes: stripHtml(notes || ""),
        reporterName: stripHtml(reporterName || req.user?.name || ""),
        reporterPhone: stripHtml(reporterPhone),
        reporterAltContact: stripHtml(reporterAltContact || ""),
        contactConsent: true,
        lastStatusNote: status === "review" ? "Report is being reviewed for possible duplication." : "Report received.",
        reporterKey: key,
        imageFingerprint: upload.imageFingerprint,
        duplicateOfReportId: duplicate?.reportId || null,
        reviewReason,
        status,
        userId: req.user?.id || null,
      }).returning("id");
      const reportId = typeof inserted === "object" ? inserted.id : inserted;
      await recordReportStatusEvent(trx, {
        reportId,
        status,
        note: status === "review" ? "Report submitted and queued for review." : "Report submitted.",
        changedBy: req.user?.id || null,
      });
      return reportId;
    });

    // Award points for rescue report (authenticated users only)
    if (req.user && status !== "review") {
      try {
        await awardPoints(req.user.id, 10, "rescue_report", "Submitted a rescue report", id);
      } catch (err) {
        console.error("Points award failed (non-fatal):", err.message);
      }
    }

    const report = await db("reports")
      .where({ id })
      .select(
        "id",
        "photoUrl",
        "latitude",
        "longitude",
        "tags",
        "notes",
        "status",
        "reporterName",
        "reporterPhone",
        "reporterAltContact",
        "lastStatusNote",
        "duplicateOfReportId",
        "reviewReason",
        "createdAt",
        "updatedAt",
      )
      .first();
    const events = await db("report_status_events")
      .where({ reportId: id })
      .orderBy("createdAt", "asc")
      .select("id", "status", "note", "createdAt");
    report.tags = JSON.parse(report.tags);
    res.status(201).json({
      ...report,
      events,
      reviewRequired: status === "review",
      pointsAwarded: req.user && status !== "review" ? 10 : 0,
    });
  } catch (error) {
    console.error("Report save failed:", error.message);
    res.status(500).json({ error: "Unable to save report" });
  }
});

if (config.enableReportList) {
  app.get("/reports", async (req, res) => {
    const reports = await db("reports").select(
      "id",
      "photoUrl",
      "latitude",
      "longitude",
      "tags",
      "notes",
      "status",
      "reporterName",
      "reporterPhone",
      "reporterAltContact",
      "lastStatusNote",
      "createdAt",
      "updatedAt",
    );
    res.json(reports.map((report) => ({ ...report, tags: JSON.parse(report.tags) })));
  });
}

function requireShelter(req, res, next) {
  if (req.user && ["shelter", "admin"].includes(req.user.role)) {
    return next();
  }
  if (!config.shelterApiToken) {
    return res.status(503).json({ error: "Shelter moderation is not configured" });
  }
  const token = req.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length !== config.shelterApiToken.length) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(config.shelterApiToken));
  return valid ? next() : res.status(401).json({ error: "Unauthorized" });
}

app.get("/moderation/reports", optionalAuth, requireShelter, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "review";
  if (!["pending", "review", "false", "abusive"].includes(status)) {
    return res.status(400).json({ error: "Invalid report status" });
  }
  const reports = await db("reports")
    .where({ status })
    .select(
      "id",
      "photoUrl",
      "latitude",
      "longitude",
      "tags",
      "notes",
      "status",
      "reporterName",
      "reporterPhone",
      "reporterAltContact",
      "lastStatusNote",
      "duplicateOfReportId",
      "reviewReason",
      "createdAt",
      "updatedAt",
    );
  res.json(reports.map((report) => ({ ...report, tags: JSON.parse(report.tags) })));
});

app.patch("/moderation/reports/:id", optionalAuth, requireShelter, async (req, res) => {
  const reportId = Number.parseInt(req.params.id, 10);
  const { action, reason } = req.body || {};
  const shelterId = req.user ? `user:${req.user.id}` : req.body?.shelterId;
  if (
    !Number.isSafeInteger(reportId)
    || !["false", "abusive", "clear"].includes(action)
    || typeof reason !== "string"
    || !reason.trim()
    || reason.length > 1000
    || typeof shelterId !== "string"
    || !shelterId.trim()
    || shelterId.length > 100
  ) {
    return res.status(400).json({ error: "Invalid moderation action" });
  }

  const report = await db("reports").where({ id: reportId }).first();
  if (!report?.reporterKey) {
    return res.status(404).json({ error: "Report not found" });
  }
  await recordModeration({
    report,
    action,
    reason: reason.trim(),
    shelterId: shelterId.trim(),
  });
  const updated = await db("reports").where({ id: reportId }).first();
  const reporter = await db("reporters").where({ reporterKey: report.reporterKey }).first();
  res.json({
    report: { id: updated.id, status: updated.status, reviewReason: updated.reviewReason },
    reporterSuspended: Boolean(reporter.suspendedAt),
    confirmedAbuseCount: reporter.confirmedAbuseCount,
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Image is too large. Choose one under 7 MB." });
  }
  if (error?.message === "Origin not allowed") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  console.error("Unhandled request error:", error.message);
  return res.status(500).json({ error: "Internal server error" });
});

ensureSchema()
  .then(ensureFoundationSchema)
  .then(ensureFeaturesSchema)
  .then(() => server.listen(config.port, '0.0.0.0', () => {
    console.log(`PawPin backend listening on port ${config.port} using ${databaseMode}`);
  }))
  .catch((err) => {
    console.error(`Schema initialization failed using ${databaseMode}:`, err.message);
    process.exit(1);
  });
