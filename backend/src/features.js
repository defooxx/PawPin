/**
 * features.js — Shelters, Vets, Lost & Found, Cruelty Reports, Points, Adoption
 *
 * Mounted in index.js after foundationRouter.
 */
import express from "express";
import { rateLimit } from "express-rate-limit";
import db from "./db.js";
import { optionalAuth, requireAuth, requireRole } from "./auth.js";

const router = express.Router();

// ─── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>/g, "").trim();
}

function validCoordinate(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

const postRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// ─── schema ───────────────────────────────────────────────────────────────────

// ─── points helper (used by other routes) ────────────────────────────────────

export async function awardPoints(userId, amount, type, description, referenceId = null) {
  await db.transaction(async (trx) => {
    await trx("points_transactions").insert({ userId, amount, type, description, referenceId });
    await trx("users").where({ id: userId }).increment("pointsBalance", amount);
  });
}

export async function ensureFeaturesSchema() {
  // Points transactions ledger
  if (!await db.schema.hasTable("points_transactions")) {
    await db.schema.createTable("points_transactions", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.integer("amount").notNullable(); // positive = earned, negative = spent
      table.string("type", 50).notNullable(); // rescue_report | cruelty_report | reunited | redemption | manual
      table.text("description").notNullable();
      table.integer("referenceId"); // report/post ID that triggered the award
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  // Redemption requests
  if (!await db.schema.hasTable("redemption_requests")) {
    await db.schema.createTable("redemption_requests", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.integer("pointsAmount").notNullable();
      table.text("rewardDescription").notNullable(); // what the user wants to redeem for
      table.string("status", 20).notNullable().defaultTo("pending"); // pending | approved | rejected
      table.text("adminNote").defaultTo("");
      table.integer("reviewedBy");
      table.timestamp("reviewedAt");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  // Adoption posts
  if (!await db.schema.hasTable("adoption_posts")) {
    await db.schema.createTable("adoption_posts", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("petName", 100).notNullable();
      table.string("species", 50).notNullable(); // dog | cat | other
      table.string("breed", 100).defaultTo("");
      table.string("age", 50).defaultTo(""); // e.g. "Puppy · 4 months"
      table.text("description").notNullable();
      table.text("photoUrl").notNullable();
      table.text("tags").notNullable().defaultTo("[]"); // JSON array
      table.string("location", 200).defaultTo("");
      table.string("status", 20).notNullable().defaultTo("available"); // available | adopted
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  }

  // Lost & found posts
  if (!await db.schema.hasTable("lost_posts")) {
    await db.schema.createTable("lost_posts", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("type", 10).notNullable().defaultTo("lost"); // lost | found
      table.string("petName", 100).defaultTo("");
      table.string("species", 50).notNullable(); // dog | cat | other
      table.string("breed", 100).defaultTo("");
      table.text("description").notNullable();
      table.text("photoUrl").notNullable();
      table.float("latitude").notNullable();
      table.float("longitude").notNullable();
      table.string("area", 200).defaultTo(""); // human-readable area name
      table.string("status", 20).notNullable().defaultTo("open"); // open | reunited
      table.integer("assignedUserId");
      table.boolean("isPaid").notNullable().defaultTo(false);
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  } else {
    if (!await db.schema.hasColumn("lost_posts", "assignedUserId")) {
      await db.schema.alterTable("lost_posts", (table) => table.integer("assignedUserId"));
    }
  }

  // Animal cruelty reports
  if (!await db.schema.hasTable("cruelty_reports")) {
    await db.schema.createTable("cruelty_reports", (table) => {
      table.increments("id").primary();
      table.integer("userId"); // nullable — anonymous allowed
      table.text("description").notNullable();
      table.text("photoUrl").defaultTo("");
      table.float("latitude").notNullable();
      table.float("longitude").notNullable();
      table.string("area", 200).defaultTo("");
      table.string("status", 20).notNullable().defaultTo("pending"); // pending | investigating | resolved | dismissed
      table.text("adminNote").defaultTo("");
      table.integer("reviewedBy");
      table.timestamp("reviewedAt");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  // Adoption meetings table
  if (!await db.schema.hasTable("adoption_meetings")) {
    await db.schema.createTable("adoption_meetings", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("userName", 100).notNullable();
      table.string("userContact", 100).defaultTo("");
      table.integer("petId").notNullable();
      table.string("petName", 100).notNullable();
      table.integer("shelterId").notNullable();
      table.string("slot", 100).notNullable();
      table.string("status", 20).notNullable().defaultTo("pending"); // pending | confirmed | completed
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  }

  // Consultation requests table
  if (!await db.schema.hasTable("consultation_requests")) {
    await db.schema.createTable("consultation_requests", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("userName", 100).notNullable();
      table.string("userContact", 100).defaultTo("");
      table.string("petSpecies", 50).notNullable();
      table.text("symptoms").notNullable().defaultTo("[]"); // JSON array of symptoms
      table.string("status", 20).notNullable().defaultTo("pending"); // pending | contacted | resolved
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  }
}

// ─── shelters ─────────────────────────────────────────────────────────────────

/**
 * GET /shelters
 * List all approved shelter accounts with basic profile info.
 */
router.get("/shelters", async (req, res) => {
  const shelters = await db("users")
    .where({ role: "shelter", status: "active" })
    .select("id", "name", "photoUrl", "location", "createdAt")
    .orderBy("name");

  // Attach their approved application details (org name, address)
  const ids = shelters.map((s) => s.id);
  const applications = ids.length
    ? await db("organization_applications")
      .whereIn("userId", ids)
      .where({ status: "approved", type: "shelter" })
      .select("userId", "organizationName", "address")
    : [];

  const appMap = Object.fromEntries(applications.map((a) => [a.userId, a]));
  res.json(shelters.map((shelter) => ({
    ...shelter,
    organizationName: appMap[shelter.id]?.organizationName || shelter.name,
    address: appMap[shelter.id]?.address || shelter.location,
  })));
});

/**
 * GET /shelters/:id
 * Single shelter profile.
 */
router.get("/shelters/:id", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid shelter ID" });

  const shelter = await db("users")
    .where({ id, role: "shelter", status: "active" })
    .select("id", "name", "photoUrl", "location", "createdAt")
    .first();
  if (!shelter) return res.status(404).json({ error: "Shelter not found" });

  const application = await db("organization_applications")
    .where({ userId: id, status: "approved", type: "shelter" })
    .select("organizationName", "address", "registrationNumber")
    .first();

  res.json({
    ...shelter,
    organizationName: application?.organizationName || shelter.name,
    address: application?.address || shelter.location,
    registrationNumber: application?.registrationNumber || "",
  });
});

// ─── vets ─────────────────────────────────────────────────────────────────────

/**
 * GET /vets
 * List all approved vet accounts.
 */
router.get("/vets", async (req, res) => {
  const vets = await db("users")
    .where({ role: "vet", status: "active" })
    .select("id", "name", "photoUrl", "location", "createdAt")
    .orderBy("name");

  const ids = vets.map((v) => v.id);
  const applications = ids.length
    ? await db("organization_applications")
      .whereIn("userId", ids)
      .where({ status: "approved", type: "vet" })
      .select("userId", "organizationName", "address")
    : [];

  const appMap = Object.fromEntries(applications.map((a) => [a.userId, a]));
  res.json(vets.map((vet) => ({
    ...vet,
    clinicName: appMap[vet.id]?.organizationName || vet.name,
    address: appMap[vet.id]?.address || vet.location,
  })));
});

// ─── lost & found ─────────────────────────────────────────────────────────────

/**
 * GET /map/pins
 * Public map data. Rescue coordinates are rounded to avoid exposing an exact
 * animal location; approved responders use the protected moderation routes.
 */
router.get("/map/pins", optionalAuth, async (req, res) => {
  const [reports, lostPosts] = await Promise.all([
    db("reports as r")
      .leftJoin("users as u", "r.assignedUserId", "u.id")
      .whereIn("r.status", ["pending", "review", "assigned"])
      .select(
        "r.id", "r.latitude", "r.longitude", "r.tags", "r.status", "r.createdAt",
        "r.userId", "r.assignedUserId", "u.name as assignedUserName", "r.photoUrl", "r.notes"
      )
      .orderBy("r.createdAt", "desc")
      .limit(100),
    db("lost_posts as post")
      .join("users as user", "post.userId", "user.id")
      .leftJoin("users as rescuer", "post.assignedUserId", "rescuer.id")
      .whereIn("post.status", ["open", "assigned"])
      .select(
        "post.id", "post.type", "post.petName", "post.species", "post.latitude",
        "post.longitude", "post.area", "post.createdAt", "post.userId",
        "post.assignedUserId", "user.name as postedBy", "rescuer.name as assignedUserName"
      )
      .orderBy("post.createdAt", "desc")
      .limit(100),
  ]);

  res.json([
    ...reports.map((report) => {
      const isOwnerOrAssigned = req.user && (report.userId === req.user.id || report.assignedUserId === req.user.id);
      return {
        ...report,
        kind: "rescue",
        latitude: isOwnerOrAssigned ? Number(report.latitude) : Number(Number(report.latitude).toFixed(3)),
        longitude: isOwnerOrAssigned ? Number(report.longitude) : Number(Number(report.longitude).toFixed(3)),
        tags: JSON.parse(report.tags),
      };
    }),
    ...lostPosts.map((post) => {
      const isOwnerOrAssigned = req.user && (post.userId === req.user.id || post.assignedUserId === req.user.id);
      return {
        ...post,
        kind: "lost",
        latitude: isOwnerOrAssigned ? Number(post.latitude) : Number(Number(post.latitude).toFixed(3)),
        longitude: isOwnerOrAssigned ? Number(post.longitude) : Number(Number(post.longitude).toFixed(3)),
      };
    }),
  ]);
});

/**
 * POST /map/pins/:kind/:id/assign
 * Assign a rescuer to a rescue report or lost post.
 */
router.post("/map/pins/:kind/:id/assign", requireAuth, async (req, res) => {
  const { kind, id } = req.params;
  const pinId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(pinId) || !["rescue", "lost"].includes(kind)) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  try {
    if (kind === "rescue") {
      const report = await db("reports").where({ id: pinId }).first();
      if (!report) return res.status(404).json({ error: "Rescue report not found" });
      if (report.assignedUserId) return res.status(400).json({ error: "Rescue report is already assigned" });

      await db("reports").where({ id: pinId }).update({
        assignedUserId: req.user.id,
        status: "assigned",
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-assigned", {
          id: pinId,
          kind: "rescue",
          assignedUserId: req.user.id,
          assignedUserName: req.user.name,
          status: "assigned",
        });
      }

      return res.json({ success: true, status: "assigned", assignedUserId: req.user.id, assignedUserName: req.user.name });
    } else {
      const post = await db("lost_posts").where({ id: pinId }).first();
      if (!post) return res.status(404).json({ error: "Lost animal post not found" });
      if (post.assignedUserId) return res.status(400).json({ error: "Lost animal post is already assigned" });

      await db("lost_posts").where({ id: pinId }).update({
        assignedUserId: req.user.id,
        status: "assigned",
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-assigned", {
          id: pinId,
          kind: "lost",
          assignedUserId: req.user.id,
          assignedUserName: req.user.name,
          status: "assigned",
        });
      }

      return res.json({ success: true, status: "assigned", assignedUserId: req.user.id, assignedUserName: req.user.name });
    }
  } catch (error) {
    console.error("Assignment failed:", error.message);
    res.status(500).json({ error: "Unable to assign rescuer" });
  }
});

/**
 * POST /map/pins/:kind/:id/unassign
 * Unassign a rescuer from a rescue report or lost post.
 */
router.post("/map/pins/:kind/:id/unassign", requireAuth, async (req, res) => {
  const { kind, id } = req.params;
  const pinId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(pinId) || !["rescue", "lost"].includes(kind)) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  try {
    if (kind === "rescue") {
      const report = await db("reports").where({ id: pinId }).first();
      if (!report) return res.status(404).json({ error: "Rescue report not found" });
      if (report.assignedUserId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "You are not assigned to this rescue" });
      }

      await db("reports").where({ id: pinId }).update({
        assignedUserId: null,
        status: "pending",
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-unassigned", {
          id: pinId,
          kind: "rescue",
          status: "pending",
        });
      }

      return res.json({ success: true, status: "pending", assignedUserId: null, assignedUserName: null });
    } else {
      const post = await db("lost_posts").where({ id: pinId }).first();
      if (!post) return res.status(404).json({ error: "Lost animal post not found" });
      if (post.assignedUserId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "You are not assigned to this post" });
      }

      await db("lost_posts").where({ id: pinId }).update({
        assignedUserId: null,
        status: "open",
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-unassigned", {
          id: pinId,
          kind: "lost",
          status: "open",
        });
      }

      return res.json({ success: true, status: "open", assignedUserId: null, assignedUserName: null });
    }
  } catch (error) {
    console.error("Unassignment failed:", error.message);
    res.status(500).json({ error: "Unable to unassign rescuer" });
  }
});

/**
 * POST /map/pins/:kind/:id/resolve
 * Mark a rescue report as resolved, or a lost post as reunited.
 */
router.post("/map/pins/:kind/:id/resolve", requireAuth, async (req, res) => {
  const { kind, id } = req.params;
  const pinId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(pinId) || !["rescue", "lost"].includes(kind)) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  try {
    if (kind === "rescue") {
      const report = await db("reports").where({ id: pinId }).first();
      if (!report) return res.status(404).json({ error: "Rescue report not found" });
      if (report.assignedUserId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Only the assigned responder or an admin can resolve the case" });
      }

      await db("reports").where({ id: pinId }).update({
        status: "resolved",
        updatedAt: db.fn.now(),
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-resolved", { id: pinId, kind: "rescue", status: "resolved" });
      }

      return res.json({ success: true, status: "resolved" });
    } else {
      const post = await db("lost_posts").where({ id: pinId }).first();
      if (!post) return res.status(404).json({ error: "Lost animal post not found" });
      if (post.userId !== req.user.id && post.assignedUserId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Only the creator, helper, or an admin can resolve this post" });
      }

      await db("lost_posts").where({ id: pinId }).update({
        status: "reunited",
        updatedAt: db.fn.now(),
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("pin-resolved", { id: pinId, kind: "lost", status: "reunited" });
      }

      return res.json({ success: true, status: "reunited" });
    }
  } catch (error) {
    console.error("Resolve failed:", error.message);
    res.status(500).json({ error: "Unable to resolve case" });
  }
});

/**
 * GET /lost
 * List lost/found posts. Filter by type (lost|found) or status (open|reunited).
 */
router.get("/lost", async (req, res) => {
  const { type, status = "open", species } = req.query;
  const validTypes = new Set(["lost", "found"]);
  const validStatuses = new Set(["open", "reunited"]);
  const validSpecies = new Set(["dog", "cat", "other"]);

  if (type && !validTypes.has(type)) return res.status(400).json({ error: "type must be lost or found" });
  if (!validStatuses.has(status)) return res.status(400).json({ error: "status must be open or reunited" });
  if (species && !validSpecies.has(species)) return res.status(400).json({ error: "species must be dog, cat, or other" });

  let query = db("lost_posts as post")
    .join("users as u", "post.userId", "u.id")
    .where("post.status", status)
    .select(
      "post.id", "post.type", "post.petName", "post.species", "post.breed",
      "post.description", "post.photoUrl", "post.latitude", "post.longitude",
      "post.area", "post.status", "post.createdAt",
      "u.name as postedBy", "u.photoUrl as posterPhoto",
    )
    .orderBy("post.createdAt", "desc")
    .limit(50);

  if (type) query = query.where("post.type", type);
  if (species) query = query.where("post.species", species);

  const posts = await query;
  res.json(posts);
});

/**
 * POST /lost
 * Create a new lost or found pet post. Requires auth.
 */
router.post("/lost", requireAuth, postRateLimit, async (req, res) => {
  const {
    type, petName = "", species, breed = "", description,
    photoUrl, latitude, longitude, area = "",
  } = req.body || {};

  const validTypes = new Set(["lost", "found"]);
  const validSpecies = new Set(["dog", "cat", "other"]);

  if (
    !validTypes.has(type)
    || !validSpecies.has(species)
    || typeof description !== "string" || description.trim().length < 10 || description.length > 1000
    || typeof photoUrl !== "string" || !photoUrl.startsWith("https://") || photoUrl.length > 2048
    || !validCoordinate(latitude, -90, 90)
    || !validCoordinate(longitude, -180, 180)
    || (petName && (typeof petName !== "string" || petName.length > 100))
    || (breed && (typeof breed !== "string" || breed.length > 100))
    || (area && (typeof area !== "string" || area.length > 200))
  ) {
    return res.status(400).json({ error: "Missing or invalid post details" });
  }

  const [result] = await db("lost_posts").insert({
    userId: req.user.id,
    type,
    petName: stripHtml(petName),
    species,
    breed: stripHtml(breed),
    description: stripHtml(description),
    photoUrl,
    latitude,
    longitude,
    area: stripHtml(area),
    isPaid: false, // payment not yet integrated
  }).returning("id");

  const id = typeof result === "object" ? result.id : result;
  const post = await db("lost_posts").where({ id }).first();
  res.status(201).json(post);
});

/**
 * PATCH /lost/:id/status
 * Mark a post as reunited. Only the original poster or admin can do this.
 */
router.patch("/lost/:id/status", requireAuth, postRateLimit, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(id) || !["open", "reunited"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const post = await db("lost_posts").where({ id }).first();
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.userId === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "You can only update your own posts" });

  await db("lost_posts").where({ id }).update({ status, updatedAt: db.fn.now() });

  // Award points to original poster when their post is marked reunited
  if (status === "reunited") {
    try {
      await awardPoints(post.userId, 5, "reunited", "Pet reunited via lost & found post", id);
    } catch (err) {
      console.error("Points award failed (non-fatal):", err.message);
    }
  }

  res.json({ id, status });
});

// ─── cruelty reports ──────────────────────────────────────────────────────────

/**
 * POST /cruelty
 * Submit an animal cruelty report. Auth optional (anonymous allowed).
 */
router.post("/cruelty", optionalAuth, postRateLimit, async (req, res) => {
  const { description, photoUrl = "", latitude, longitude, area = "" } = req.body || {};

  if (
    typeof description !== "string" || description.trim().length < 10 || description.length > 2000
    || !validCoordinate(latitude, -90, 90)
    || !validCoordinate(longitude, -180, 180)
    || (photoUrl && (typeof photoUrl !== "string" || !photoUrl.startsWith("https://") || photoUrl.length > 2048))
    || (area && (typeof area !== "string" || area.length > 200))
  ) {
    return res.status(400).json({ error: "Describe what you saw and provide a location" });
  }

  const [result] = await db("cruelty_reports").insert({
    userId: req.user?.id || null,
    description: stripHtml(description),
    photoUrl: photoUrl || "",
    latitude,
    longitude,
    area: stripHtml(area),
  }).returning("id");

  const id = typeof result === "object" ? result.id : result;

  // Award points to authenticated reporters
  if (req.user) {
    try {
      await awardPoints(req.user.id, 5, "cruelty_report", "Submitted a cruelty report", id);
    } catch (err) {
      console.error("Points award failed (non-fatal):", err.message);
    }
  }

  res.status(201).json({
    id,
    status: "pending",
    message: "Your report has been received. Our team will review it shortly.",
    pointsAwarded: req.user ? 5 : 0,
  });
});

/**
 * GET /admin/cruelty
 * List cruelty reports. Admin only.
 */
router.get("/admin/cruelty", requireAuth, requireRole("admin"), async (req, res) => {
  const status = req.query.status || "pending";
  const validStatuses = new Set(["pending", "investigating", "resolved", "dismissed"]);
  if (!validStatuses.has(status)) return res.status(400).json({ error: "Invalid status" });

  const reports = await db("cruelty_reports as cr")
    .leftJoin("users as u", "cr.userId", "u.id")
    .where("cr.status", status)
    .select(
      "cr.id", "cr.description", "cr.photoUrl", "cr.latitude", "cr.longitude",
      "cr.area", "cr.status", "cr.adminNote", "cr.createdAt",
      "u.name as reportedBy", "u.email as reporterEmail",
    )
    .orderBy("cr.createdAt", "desc");

  res.json(reports);
});

/**
 * PATCH /admin/cruelty/:id
 * Update cruelty report status. Admin only.
 */
router.patch("/admin/cruelty/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status, adminNote = "" } = req.body || {};
  const validStatuses = new Set(["investigating", "resolved", "dismissed"]);

  if (
    !Number.isSafeInteger(id)
    || !validStatuses.has(status)
    || typeof adminNote !== "string"
    || adminNote.length > 1000
  ) {
    return res.status(400).json({ error: "Invalid update" });
  }

  const report = await db("cruelty_reports").where({ id }).first();
  if (!report) return res.status(404).json({ error: "Report not found" });

  await db("cruelty_reports").where({ id }).update({
    status,
    adminNote: stripHtml(adminNote),
    reviewedBy: req.user.id,
    reviewedAt: db.fn.now(),
  });

  res.json({ id, status });
});

// ─── adoption posts ───────────────────────────────────────────────────────────

/**
 * GET /adopt
 * List available adoption posts.
 */
router.get("/adopt", async (req, res) => {
  const { species, status = "available" } = req.query;
  const validSpecies = new Set(["dog", "cat", "other"]);
  const validStatuses = new Set(["available", "adopted"]);

  if (species && !validSpecies.has(species)) return res.status(400).json({ error: "species must be dog, cat, or other" });
  if (!validStatuses.has(status)) return res.status(400).json({ error: "status must be available or adopted" });

  let query = db("adoption_posts as ap")
    .join("users as u", "ap.userId", "u.id")
    .where("ap.status", status)
    .select(
      "ap.id", "ap.petName", "ap.species", "ap.breed", "ap.age",
      "ap.description", "ap.photoUrl", "ap.tags", "ap.location",
      "ap.status", "ap.createdAt",
      "u.name as postedBy", "u.id as posterId",
    )
    .orderBy("ap.createdAt", "desc")
    .limit(50);

  if (species) query = query.where("ap.species", species);

  const posts = await query;
  res.json(posts.map((p) => ({ ...p, tags: JSON.parse(p.tags) })));
});

/**
 * POST /adopt
 * Create an adoption post. Auth required.
 */
router.post("/adopt", requireAuth, postRateLimit, async (req, res) => {
  const { petName, species, breed = "", age = "", description, photoUrl, tags = [], location = "" } = req.body || {};
  const validSpecies = new Set(["dog", "cat", "other"]);

  if (
    !validSpecies.has(species)
    || typeof petName !== "string" || petName.trim().length < 1 || petName.length > 100
    || typeof description !== "string" || description.trim().length < 10 || description.length > 1000
    || typeof photoUrl !== "string" || !photoUrl.startsWith("https://") || photoUrl.length > 2048
    || !Array.isArray(tags) || tags.length > 10
    || (breed && typeof breed !== "string") || breed.length > 100
    || (age && typeof age !== "string") || age.length > 50
    || (location && typeof location !== "string") || location.length > 200
  ) {
    return res.status(400).json({ error: "Missing or invalid adoption post details" });
  }

  const [result] = await db("adoption_posts").insert({
    userId: req.user.id,
    petName: stripHtml(petName),
    species,
    breed: stripHtml(breed),
    age: stripHtml(age),
    description: stripHtml(description),
    photoUrl,
    tags: JSON.stringify(tags.map((t) => stripHtml(String(t)))),
    location: stripHtml(location),
  }).returning("id");

  const id = typeof result === "object" ? result.id : result;
  const post = await db("adoption_posts").where({ id }).first();
  res.status(201).json({ ...post, tags: JSON.parse(post.tags) });
});

/**
 * PATCH /adopt/:id/status
 * Mark as adopted. Only poster or admin.
 */
router.patch("/adopt/:id/status", requireAuth, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(id) || !["available", "adopted"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const post = await db("adoption_posts").where({ id }).first();
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (post.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You can only update your own posts" });
  }

  await db("adoption_posts").where({ id }).update({ status, updatedAt: db.fn.now() });
  res.json({ id, status });
});

// ─── points ───────────────────────────────────────────────────────────────────

/**
 * GET /points
 * Get current user's points balance and recent transactions.
 */
router.get("/points", requireAuth, async (req, res) => {
  const user = await db("users").where({ id: req.user.id }).select("pointsBalance").first();
  const transactions = await db("points_transactions")
    .where({ userId: req.user.id })
    .orderBy("createdAt", "desc")
    .limit(20)
    .select("id", "amount", "type", "description", "createdAt");

  const pendingRedemption = await db("redemption_requests")
    .where({ userId: req.user.id, status: "pending" })
    .first();

  res.json({
    balance: user.pointsBalance,
    transactions,
    hasPendingRedemption: Boolean(pendingRedemption),
  });
});

/**
 * POST /points/redeem
 * Request a points redemption. Auth required. One pending at a time.
 */
router.post("/points/redeem", requireAuth, postRateLimit, async (req, res) => {
  const { pointsAmount, rewardDescription } = req.body || {};

  if (
    !Number.isSafeInteger(pointsAmount) || pointsAmount < 50 || pointsAmount > 10000
    || typeof rewardDescription !== "string"
    || rewardDescription.trim().length < 5
    || rewardDescription.length > 500
  ) {
    return res.status(400).json({ error: "Choose a valid points amount (min 50) and describe what you want" });
  }

  const user = await db("users").where({ id: req.user.id }).select("pointsBalance").first();
  if (user.pointsBalance < pointsAmount) {
    return res.status(400).json({ error: `Not enough points. You have ${user.pointsBalance} pts.` });
  }

  const existing = await db("redemption_requests").where({ userId: req.user.id, status: "pending" }).first();
  if (existing) {
    return res.status(409).json({ error: "You already have a pending redemption request" });
  }

  const [result] = await db("redemption_requests").insert({
    userId: req.user.id,
    pointsAmount,
    rewardDescription: stripHtml(rewardDescription),
  }).returning("id");

  const id = typeof result === "object" ? result.id : result;
  res.status(201).json({ id, status: "pending", message: "Redemption request submitted. Admin will review it shortly." });
});

/**
 * GET /admin/points/redemptions
 * List redemption requests. Admin only.
 */
router.get("/admin/points/redemptions", requireAuth, requireRole("admin"), async (req, res) => {
  const status = req.query.status || "pending";
  const validStatuses = new Set(["pending", "approved", "rejected"]);
  if (!validStatuses.has(status)) return res.status(400).json({ error: "Invalid status" });

  const requests = await db("redemption_requests as rr")
    .join("users as u", "rr.userId", "u.id")
    .where("rr.status", status)
    .select(
      "rr.id", "rr.pointsAmount", "rr.rewardDescription",
      "rr.status", "rr.adminNote", "rr.createdAt",
      "u.id as userId", "u.name", "u.email", "u.pointsBalance",
    )
    .orderBy("rr.createdAt", "desc");

  res.json(requests);
});

/**
 * PATCH /admin/points/redemptions/:id
 * Approve or reject a redemption. Admin only.
 * On approval, deducts points from the user's balance.
 */
router.patch("/admin/points/redemptions/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { decision, adminNote = "" } = req.body || {};

  if (
    !Number.isSafeInteger(id)
    || !["approved", "rejected"].includes(decision)
    || typeof adminNote !== "string"
    || adminNote.length > 500
  ) {
    return res.status(400).json({ error: "Invalid decision" });
  }

  const request = await db("redemption_requests").where({ id, status: "pending" }).first();
  if (!request) return res.status(404).json({ error: "Pending redemption not found" });

  await db.transaction(async (trx) => {
    await trx("redemption_requests").where({ id }).update({
      status: decision,
      adminNote: stripHtml(adminNote),
      reviewedBy: req.user.id,
      reviewedAt: trx.fn.now(),
    });

    if (decision === "approved") {
      // Deduct points and record transaction
      await trx("users").where({ id: request.userId }).decrement("pointsBalance", request.pointsAmount);
      await trx("points_transactions").insert({
        userId: request.userId,
        amount: -request.pointsAmount,
        type: "redemption",
        description: `Redeemed: ${request.rewardDescription}`,
        referenceId: id,
      });
    }
  });

  res.json({ id, status: decision });
});

/**
 * POST /admin/points/award
 * Manually award points to any user. Admin only.
 */
router.post("/admin/points/award", requireAuth, requireRole("admin"), async (req, res) => {
  const { userId, amount, description } = req.body || {};

  if (
    !Number.isSafeInteger(userId)
    || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 10000
    || typeof description !== "string" || description.trim().length < 3
  ) {
    return res.status(400).json({ error: "Invalid award details" });
  }

  const user = await db("users").where({ id: userId }).first();
  if (!user) return res.status(404).json({ error: "User not found" });

  await awardPoints(userId, amount, "manual", stripHtml(description));
  const updated = await db("users").where({ id: userId }).select("pointsBalance").first();
  res.json({ userId, newBalance: updated.pointsBalance });
});

/**
 * POST /adopt/meetings
 * Request a slot for a pet adoption meeting.
 */
router.post("/adopt/meetings", requireAuth, async (req, res) => {
  const { petId, petName, shelterId, slot } = req.body || {};

  if (!Number.isSafeInteger(petId) || !Number.isSafeInteger(shelterId) || typeof petName !== "string" || !petName.trim() || typeof slot !== "string" || !slot.trim()) {
    return res.status(400).json({ error: "Missing or invalid meeting details" });
  }

  try {
    const [inserted] = await db("adoption_meetings").insert({
      userId: req.user.id,
      userName: req.user.name,
      userContact: req.user.email || req.user.phoneNumber || "No contact info",
      petId,
      petName: stripHtml(petName),
      shelterId,
      slot: stripHtml(slot),
      status: "pending",
    }).returning("id");

    const id = typeof inserted === "object" ? inserted.id : inserted;
    const meeting = await db("adoption_meetings").where({ id }).first();
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Failed to create adoption meeting:", error.message);
    res.status(500).json({ error: "Failed to request meeting" });
  }
});

/**
 * GET /adopt/meetings
 * List meetings. Shelters see requests sent to them. Users see requests they sent.
 */
router.get("/adopt/meetings", requireAuth, async (req, res) => {
  try {
    let query = db("adoption_meetings");
    if (req.user.role === "shelter") {
      query = query.where({ shelterId: req.user.id });
    } else if (req.user.role === "user") {
      query = query.where({ userId: req.user.id });
    } else if (req.user.role === "admin") {
      // Admins see all
    } else {
      return res.json([]);
    }
    const meetings = await query.orderBy("createdAt", "desc");
    res.json(meetings);
  } catch (error) {
    console.error("Failed to fetch meetings:", error.message);
    res.status(500).json({ error: "Failed to retrieve meetings" });
  }
});

/**
 * PATCH /adopt/meetings/:id
 * Update meeting status (confirm, complete, or cancel).
 */
router.patch("/adopt/meetings/:id", requireAuth, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(id) || !["confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const meeting = await db("adoption_meetings").where({ id }).first();
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    if (req.user.role === "admin") {
      // allow
    } else if (status === "cancelled") {
      if (meeting.userId !== req.user.id) {
        return res.status(403).json({ error: "You can only cancel your own meetings" });
      }
    } else {
      if (meeting.shelterId !== req.user.id) {
        return res.status(403).json({ error: "Only the shelter can update this meeting status" });
      }
    }

    await db("adoption_meetings").where({ id }).update({
      status,
      updatedAt: db.fn.now(),
    });

    res.json({ id, status });
  } catch (error) {
    console.error("Failed to update meeting:", error.message);
    res.status(500).json({ error: "Failed to update meeting status" });
  }
});

/**
 * POST /consultations
 * Create a vet consultation request.
 */
router.post("/consultations", requireAuth, async (req, res) => {
  const { petSpecies, symptoms } = req.body || {};

  if (!["dog", "cat"].includes(petSpecies) || !Array.isArray(symptoms)) {
    return res.status(400).json({ error: "Invalid consultation details" });
  }

  try {
    const [inserted] = await db("consultation_requests").insert({
      userId: req.user.id,
      userName: req.user.name,
      userContact: req.user.email || req.user.phoneNumber || "No contact info",
      petSpecies,
      symptoms: JSON.stringify(symptoms.map(s => stripHtml(String(s)))),
      status: "pending",
    }).returning("id");

    const id = typeof inserted === "object" ? inserted.id : inserted;
    const request = await db("consultation_requests").where({ id }).first();
    res.status(201).json({ ...request, symptoms: JSON.parse(request.symptoms) });
  } catch (error) {
    console.error("Failed to create consultation request:", error.message);
    res.status(500).json({ error: "Failed to submit consultation request" });
  }
});

/**
 * GET /consultations
 * List consultation requests. Vets see all open ones, users see their own.
 */
router.get("/consultations", requireAuth, async (req, res) => {
  try {
    let query = db("consultation_requests");
    if (req.user.role === "vet") {
      query = query.whereIn("status", ["pending", "contacted"]);
    } else if (req.user.role === "user") {
      query = query.where({ userId: req.user.id });
    } else if (req.user.role === "admin") {
      // Admins see all
    } else {
      return res.json([]);
    }
    const list = await query.orderBy("createdAt", "desc");
    res.json(list.map(r => ({ ...r, symptoms: JSON.parse(r.symptoms) })));
  } catch (error) {
    console.error("Failed to fetch consultations:", error.message);
    res.status(500).json({ error: "Failed to retrieve consultations" });
  }
});

/**
 * PATCH /consultations/:id
 * Let Vets update status to contacted or resolved.
 */
router.patch("/consultations/:id", requireAuth, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(id) || !["contacted", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const request = await db("consultation_requests").where({ id }).first();
    if (!request) return res.status(404).json({ error: "Consultation not found" });

    if (req.user.role !== "vet" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only vets or admins can respond to consultations" });
    }

    await db("consultation_requests").where({ id }).update({
      status,
      updatedAt: db.fn.now(),
    });

    res.json({ id, status });
  } catch (error) {
    console.error("Failed to update consultation:", error.message);
    res.status(500).json({ error: "Failed to update consultation status" });
  }
});

export default router;
