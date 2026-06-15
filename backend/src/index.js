import "express-async-errors";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import db, { databaseMode } from "./db.js";
import { config } from "./config.js";
import { optionalAuth } from "./auth.js";
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
import { v2 as cloudinary } from "cloudinary";

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>/g, "").trim();
}

const app = express();
app.disable("x-powered-by");
app.use(helmet());
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

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
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
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  const reportColumns = [
    ["reporterKey", (table) => table.string("reporterKey", 64)],
    ["imageFingerprint", (table) => table.string("imageFingerprint", 64)],
    ["duplicateOfReportId", (table) => table.integer("duplicateOfReportId")],
    ["reviewReason", (table) => table.text("reviewReason")],
    ["reviewedAt", (table) => table.timestamp("reviewedAt")],
  ];
  for (const [column, addColumn] of reportColumns) {
    if (!await db.schema.hasColumn("reports", column)) {
      await db.schema.alterTable("reports", addColumn);
    }
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
    const result = await cloudinary.uploader.upload(image.dataUrl, {
      folder: "pawpin-reports",
      resource_type: "image",
      type: "upload",
    });

    await db("image_uploads").insert({
      photoUrl: result.secure_url,
      imageFingerprint: fingerprint,
      reporterKey: key,
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "PawPin backend is running" });
});

app.post("/reports", reportRateLimit, optionalAuth, async (req, res) => {
  const { photoUrl, latitude, longitude, tags, notes } = req.body;
  if (
    typeof photoUrl !== "string"
    || !photoUrl.startsWith("https://")
    || photoUrl.length > 2048
    || !validCoordinate(latitude, -90, 90)
    || !validCoordinate(longitude, -180, 180)
    || !validTags(tags)
    || (notes !== undefined && (typeof notes !== "string" || notes.length > 1000))
  ) {
    return res.status(400).json({ error: "Missing or invalid report data" });
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

    const [inserted] = await db("reports").insert({
      photoUrl,
      latitude,
      longitude,
      tags: JSON.stringify(tags.map((tag) => tag.trim())),
      notes: stripHtml(notes || ""),
      reporterKey: key,
      imageFingerprint: upload.imageFingerprint,
      duplicateOfReportId: duplicate?.reportId || null,
      reviewReason,
      status,
      userId: req.user?.id || null,
    }).returning("id");
    const id = typeof inserted === "object" ? inserted.id : inserted;

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
        "duplicateOfReportId",
        "reviewReason",
        "createdAt",
      )
      .first();
    report.tags = JSON.parse(report.tags);
    res.status(201).json({
      ...report,
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
      "createdAt",
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
    .select("id", "photoUrl", "latitude", "longitude", "tags", "notes", "status", "duplicateOfReportId", "reviewReason", "createdAt");
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
  .then(() => app.listen(config.port, '0.0.0.0', () => {
    console.log(`PawPin backend listening on port ${config.port} using ${databaseMode}`);
  }))
  .catch((err) => {
    console.error(`Schema initialization failed using ${databaseMode}:`, err.message);
    process.exit(1);
  });
