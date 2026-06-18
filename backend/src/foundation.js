import express from "express";
import { rateLimit } from "express-rate-limit";
import { v2 as cloudinary } from "cloudinary";
import db from "./db.js";
import { config } from "./config.js";
import { adminAuth } from "./firebase-admin.js";
import {
  hashPassword,
  isGoogleAuthConfigured,
  issueToken,
  publicUser,
  requireAuth,
  requireRole,
  verifyGoogleCredential,
  verifyPassword,
} from "./auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";
import {
  accountTypes,
  cleanEmail,
  createOneTimeToken,
  hashOneTimeToken,
  validPassword,
  validRegistrationConsent,
} from "./registration.js";

const router = express.Router();
const roles = new Set(["user", "shelter", "vet", "admin"]);
const applicationTypes = new Set(["shelter", "vet"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Strip HTML tags from user-supplied strings to prevent XSS if content
// is ever rendered in the admin panel or emails.
function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value.replace(/<[^>]*>/g, "").trim();
}

function validProfile({ name, photoUrl, location }) {
  return typeof name === "string"
    && name.trim().length >= 2
    && name.trim().length <= 100
    && (photoUrl === undefined || photoUrl === "" || (typeof photoUrl === "string" && photoUrl.startsWith("https://") && photoUrl.length <= 2048))
    && (location === undefined || location === "" || (typeof location === "string" && location.length <= 200));
}

async function audit(userId, action, detail = "") {
  await db("auth_audit").insert({ userId, action, detail });
}

async function insertId(table, values) {
  const [result] = await db(table).insert(values).returning("id");
  return typeof result === "object" ? result.id : result;
}

async function signedDocuments(userId, urls) {
  const documents = await db("verification_documents")
    .where({ userId })
    .whereIn("url", urls);
  return documents.map((document) => cloudinary.url(document.publicId, {
    resource_type: document.resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
  }));
}

async function authResponse(user) {
  return { token: issueToken(user), user: publicUser(user) };
}

async function createAuthToken({ userId, type, minutes }) {
  const token = createOneTimeToken();
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  await db("auth_tokens").insert({
    userId,
    type,
    tokenHash: hashOneTimeToken(token),
    expiresAt,
  });
  return token;
}

async function findUsableAuthToken(token, type) {
  if (typeof token !== "string" || token.length < 20) return null;
  return db("auth_tokens")
    .where({
      type,
      tokenHash: hashOneTimeToken(token),
      usedAt: null,
    })
    .where("expiresAt", ">", new Date())
    .first();
}

export async function ensureFoundationSchema() {
  if (!await db.schema.hasTable("users")) {
    await db.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("email", 254).notNullable().unique();
      table.string("passwordHash", 255);
      table.string("googleSubject", 255).unique();
      table.string("name", 100).notNullable();
      table.text("photoUrl");
      table.string("location", 200).defaultTo("");
      table.string("role", 20).notNullable().defaultTo("user");
      table.string("accountType", 20).notNullable().defaultTo("user");
      table.integer("pointsBalance").notNullable().defaultTo(0);
      table.string("status", 20).notNullable().defaultTo("active");
      table.boolean("emailVerified").notNullable().defaultTo(false);
      table.timestamp("termsAcceptedAt");
      table.timestamp("privacyAcceptedAt");
      table.string("locationConsent", 20).notNullable().defaultTo("ask");
      table.timestamp("createdAt").defaultTo(db.fn.now());
      table.timestamp("updatedAt").defaultTo(db.fn.now());
    });
  }

  const userColumns = [
    ["accountType", (table) => table.string("accountType", 20).notNullable().defaultTo("user")],
    ["termsAcceptedAt", (table) => table.timestamp("termsAcceptedAt")],
    ["privacyAcceptedAt", (table) => table.timestamp("privacyAcceptedAt")],
    ["locationConsent", (table) => table.string("locationConsent", 20).notNullable().defaultTo("ask")],
    ["phoneNumber", (table) => table.string("phoneNumber", 20).unique()],
    ["phoneVerified", (table) => table.boolean("phoneVerified").notNullable().defaultTo(false)],
  ];
  for (const [column, addColumn] of userColumns) {
    if (!await db.schema.hasColumn("users", column)) await db.schema.alterTable("users", addColumn);
  }

  if (!await db.schema.hasTable("auth_tokens")) {
    await db.schema.createTable("auth_tokens", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("type", 30).notNullable();
      table.string("tokenHash", 64).notNullable().unique();
      table.timestamp("expiresAt").notNullable();
      table.timestamp("usedAt");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("organization_applications")) {
    await db.schema.createTable("organization_applications", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.string("type", 20).notNullable();
      table.string("organizationName", 150).notNullable();
      table.string("registrationNumber", 100).notNullable();
      table.string("address", 250).notNullable();
      table.text("documentUrls").notNullable();
      table.string("status", 20).notNullable().defaultTo("pending");
      table.text("reviewNote").defaultTo("");
      table.integer("reviewedBy");
      table.timestamp("reviewedAt");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("verification_documents")) {
    await db.schema.createTable("verification_documents", (table) => {
      table.increments("id").primary();
      table.integer("userId").notNullable();
      table.text("url").notNullable().unique();
      table.string("publicId", 255).notNullable();
      table.string("resourceType", 30).notNullable();
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (!await db.schema.hasTable("auth_audit")) {
    await db.schema.createTable("auth_audit", (table) => {
      table.increments("id").primary();
      table.integer("userId");
      table.string("action", 50).notNullable();
      table.text("detail").defaultTo("");
      table.timestamp("createdAt").defaultTo(db.fn.now());
    });
  }

  if (await db.schema.hasTable("reports") && !await db.schema.hasColumn("reports", "userId")) {
    await db.schema.alterTable("reports", (table) => table.integer("userId"));
  }

  if (config.adminEmail && config.adminPassword) {
    const existing = await db("users").where({ email: config.adminEmail }).first();
    if (!existing) {
      await db("users").insert({
        email: config.adminEmail,
        passwordHash: await hashPassword(config.adminPassword),
        name: "PawPin Admin",
        role: "admin",
        emailVerified: true,
      });
    }
  }
}

router.get("/auth/status", (req, res) => {
  res.json({
    emailPassword: true,
    google: {
      backendConfigured: isGoogleAuthConfigured(),
    },
    firebasePhone: {
      backendConfigured: Boolean(adminAuth),
    },
  });
});

router.post("/auth/register", authRateLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  const name = stripHtml(req.body?.name || "");
  const location = stripHtml(req.body?.location || "");
  const accountType = req.body?.accountType || "user";

  if (
    !emailPattern.test(email)
    || !validPassword(password)
    || name.length < 2
    || name.length > 100
    || location.length > 200
    || !accountTypes.has(accountType)
    || !validRegistrationConsent(req.body || {})
  ) {
    return res.status(400).json({
      error: "Enter a valid email, stronger password, name, and accept the required terms.",
    });
  }

  const existing = await db("users").where({ email }).first();
  if (existing) return res.status(409).json({ error: "An account already exists with this email" });

  const acceptedAt = db.fn.now();
  const id = await insertId("users", {
    email,
    passwordHash: await hashPassword(password),
    name,
    location,
    role: "user",
    accountType,
    emailVerified: false,
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
    locationConsent: req.body.locationConsent,
  });
  const user = await db("users").where({ id }).first();
  const token = await createAuthToken({
    userId: user.id,
    type: "email_verification",
    minutes: config.authOneTimeTokenMinutes,
  });
  await audit(user.id, "register", "password");
  const emailResult = await sendVerificationEmail({ to: user.email, name: user.name, token });
  return res.status(201).json({
    ...await authResponse(user),
    isNewUser: false,
    verificationEmailSent: emailResult.sent,
  });
});

router.post("/auth/login", authRateLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  const user = await db("users").where({ email }).first();
  if (!user?.passwordHash || !await verifyPassword(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
  await audit(user.id, "login", "password");
  return res.json(await authResponse(user));
});

router.post("/auth/verify-email", authRateLimit, async (req, res) => {
  const authToken = await findUsableAuthToken(req.body?.token, "email_verification");
  if (!authToken) return res.status(400).json({ error: "Invalid or expired verification token" });
  await db.transaction(async (trx) => {
    await trx("auth_tokens").where({ id: authToken.id }).update({ usedAt: trx.fn.now() });
    await trx("users").where({ id: authToken.userId }).update({
      emailVerified: true,
      updatedAt: trx.fn.now(),
    });
  });
  const user = await db("users").where({ id: authToken.userId }).first();
  await audit(user.id, "verify_email", "token");
  return res.json(await authResponse(user));
});

router.post("/auth/resend-verification", authRateLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const user = emailPattern.test(email) ? await db("users").where({ email }).first() : null;
  if (!user || user.emailVerified) return res.json({ sent: false });
  const token = await createAuthToken({
    userId: user.id,
    type: "email_verification",
    minutes: config.authOneTimeTokenMinutes,
  });
  const emailResult = await sendVerificationEmail({ to: user.email, name: user.name, token });
  await audit(user.id, "resend_verification", "email");
  return res.json({ sent: emailResult.sent });
});

router.post("/auth/forgot-password", authRateLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const user = emailPattern.test(email) ? await db("users").where({ email }).first() : null;
  if (user?.passwordHash && user.status === "active") {
    const token = await createAuthToken({
      userId: user.id,
      type: "password_reset",
      minutes: config.authOneTimeTokenMinutes,
    });
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
    await audit(user.id, "password_reset_request", "email");
  }
  return res.json({ ok: true });
});

router.post("/auth/reset-password", authRateLimit, async (req, res) => {
  const authToken = await findUsableAuthToken(req.body?.token, "password_reset");
  if (!authToken) return res.status(400).json({ error: "Invalid or expired reset token" });
  if (!validPassword(req.body?.password)) {
    return res.status(400).json({ error: "Password must be at least 10 characters and include a number." });
  }
  await db.transaction(async (trx) => {
    await trx("auth_tokens").where({ id: authToken.id }).update({ usedAt: trx.fn.now() });
    await trx("users").where({ id: authToken.userId }).update({
      passwordHash: await hashPassword(req.body.password),
      updatedAt: trx.fn.now(),
    });
  });
  const user = await db("users").where({ id: authToken.userId }).first();
  await audit(user.id, "password_reset", "token");
  return res.json({ ok: true });
});

router.post("/auth/google", authRateLimit, async (req, res) => {
  if (!isGoogleAuthConfigured()) {
    return res.status(503).json({ error: "Google sign-in is not configured on the backend." });
  }
  try {
    const payload = await verifyGoogleCredential(req.body?.credential);
    const email = cleanEmail(payload.email);
    if (!payload.email_verified || !emailPattern.test(email)) return res.status(401).json({ error: "Google email is not verified" });
    let user = await db("users").where({ email }).first();
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const acceptedAt = db.fn.now();
      const id = await insertId("users", {
        email,
        googleSubject: payload.sub,
        name: payload.name || email.split("@")[0],
        photoUrl: payload.picture || null,
        emailVerified: true,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        locationConsent: "ask",
      });
      user = await db("users").where({ id }).first();
    } else if (!user.googleSubject) {
      await db("users").where({ id: user.id }).update({ googleSubject: payload.sub, emailVerified: true, updatedAt: db.fn.now() });
      user = await db("users").where({ id: user.id }).first();
    }
    if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
    await audit(user.id, "login", "google");
    return res.json({ ...await authResponse(user), isNewUser });
  } catch (error) {
    console.error("Google sign-in failed:", error.message);
    return res.status(401).json({ error: "Google sign-in failed. Please try again." });
  }
});

router.post("/auth/firebase-phone", authRateLimit, async (req, res) => {
  if (!adminAuth) return res.status(503).json({ error: "Phone auth not configured" });
  const { idToken, name, location } = req.body || {};
  if (typeof idToken !== "string" || !idToken) return res.status(400).json({ error: "Missing Firebase ID token" });
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;
    if (!phoneNumber) return res.status(400).json({ error: "Token does not contain a phone number" });

    let user = await db("users").where({ phoneNumber }).first();
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const syntheticEmail = `phone__${phoneNumber.replace(/\D/g, "")}@pawpin.internal`;
      const acceptedAt = db.fn.now();
      const id = await insertId("users", {
        email: syntheticEmail,
        phoneNumber,
        phoneVerified: true,
        name: name ? stripHtml(name) : phoneNumber,
        location: location ? stripHtml(location) : "",
        role: "user",
        emailVerified: false,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        locationConsent: "ask",
      });
      user = await db("users").where({ id }).first();
    } else if (!user.phoneVerified) {
      await db("users").where({ id: user.id }).update({ phoneVerified: true, updatedAt: db.fn.now() });
      user = await db("users").where({ id: user.id }).first();
    }

    if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
    await audit(user.id, "login", "firebase_phone");
    return res.json({ ...await authResponse(user), isNewUser });
  } catch (error) {
    console.error("Firebase phone auth failed:", error.message);
    return res.status(401).json({ error: "Phone verification failed. Please try again." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const reports = await db("reports")
    .where({ userId: req.user.id })
    .select("id", "photoUrl", "tags", "status", "createdAt")
    .orderBy("createdAt", "desc");
  const application = await db("organization_applications")
    .where({ userId: req.user.id })
    .orderBy("createdAt", "desc")
    .first();
  return res.json({
    user: publicUser(req.user),
    reports: reports.map((report) => ({ ...report, tags: JSON.parse(report.tags) })),
    application: application ? { ...application, documentUrls: JSON.parse(application.documentUrls) } : null,
  });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name, location = "", accountType } = req.body || {};
  const photoUrl = req.body?.photoUrl || "";
  if (!validProfile({ name, photoUrl, location })) return res.status(400).json({ error: "Invalid profile details" });
  if (accountType !== undefined && !["user", "shelter", "vet"].includes(accountType)) return res.status(400).json({ error: "Invalid profile details" });
  await db("users").where({ id: req.user.id }).update({
    name: stripHtml(name),
    ...(req.body?.photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
    ...(accountType !== undefined ? { accountType } : {}),
    location: stripHtml(location),
    updatedAt: db.fn.now(),
  });
  const user = await db("users").where({ id: req.user.id }).first();
  return res.json({ user: publicUser(user) });
});

router.post("/me/photo", requireAuth, async (req, res) => {
  const dataUrl = req.body?.dataUrl;
  const match = typeof dataUrl === "string"
    ? /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
    : null;
  const bytes = match ? Buffer.byteLength(match[1].replace(/\s/g, ""), "base64") : 0;
  if (!match || !bytes || bytes > config.maxImageBytes) {
    return res.status(400).json({ error: "Profile photo must be a JPEG, PNG, or WebP under 7 MB" });
  }
  const uploaded = await cloudinary.uploader.upload(dataUrl, {
    folder: "pawpin-profiles",
    resource_type: "image",
    type: "upload",
  });
  await db("users").where({ id: req.user.id }).update({
    photoUrl: uploaded.secure_url,
    updatedAt: db.fn.now(),
  });
  const user = await db("users").where({ id: req.user.id }).first();
  return res.status(201).json({ user: publicUser(user), url: uploaded.secure_url });
});

router.post("/applications/documents", requireAuth, async (req, res) => {
  const dataUrl = req.body?.dataUrl;
  const match = typeof dataUrl === "string"
    ? /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
    : null;
  const bytes = match ? Buffer.byteLength(match[2].replace(/\s/g, ""), "base64") : 0;
  if (!match || !bytes || bytes > config.maxDocumentBytes) {
    return res.status(400).json({ error: "Document must be a PDF, JPEG, PNG, or WebP under 10 MB" });
  }
  const uploaded = await cloudinary.uploader.upload(dataUrl, {
    folder: "pawpin-verification",
    resource_type: "auto",
    type: "authenticated",
  });
  await db("verification_documents").insert({
    userId: req.user.id,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type,
  });
  return res.status(201).json({ url: uploaded.secure_url });
});

router.post("/applications", requireAuth, async (req, res) => {
  const { type, organizationName, registrationNumber, address, documentUrls } = req.body || {};
  const valid = applicationTypes.has(type)
    && typeof organizationName === "string" && organizationName.trim().length >= 2 && organizationName.length <= 150
    && typeof registrationNumber === "string" && registrationNumber.trim().length >= 2 && registrationNumber.length <= 100
    && typeof address === "string" && address.trim().length >= 5 && address.length <= 250
    && Array.isArray(documentUrls) && documentUrls.length > 0 && documentUrls.length <= 5
    && documentUrls.every((url) => typeof url === "string" && url.startsWith("https://") && url.length <= 2048);
  if (!valid) return res.status(400).json({ error: "Complete all application fields and upload at least one document" });
  const ownedDocuments = await db("verification_documents")
    .where({ userId: req.user.id })
    .whereIn("url", documentUrls);
  if (ownedDocuments.length !== documentUrls.length) {
    return res.status(400).json({ error: "Use documents uploaded by this account" });
  }
  const pending = await db("organization_applications").where({ userId: req.user.id, status: "pending" }).first();
  if (pending) return res.status(409).json({ error: "You already have an application waiting for review" });
  const id = await insertId("organization_applications", {
    userId: req.user.id,
    type,
    organizationName: stripHtml(organizationName),
    registrationNumber: stripHtml(registrationNumber),
    address: stripHtml(address),
    documentUrls: JSON.stringify(documentUrls),
  });
  await audit(req.user.id, "organization_application", type);
  return res.status(201).json({ id, status: "pending" });
});

router.get("/admin/applications", requireAuth, requireRole("admin"), async (req, res) => {
  const status = req.query.status || "pending";
  if (!["pending", "approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid application status" });
  const applications = await db("organization_applications as application")
    .join("users as user", "application.userId", "user.id")
    .where("application.status", status)
    .select("application.*", "user.email", "user.name");
  return res.json(await Promise.all(applications.map(async (application) => ({
    ...application,
    documentUrls: await signedDocuments(application.userId, JSON.parse(application.documentUrls)),
  }))));
});

router.patch("/admin/applications/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { decision, reviewNote = "" } = req.body || {};
  if (!Number.isSafeInteger(id) || !["approved", "rejected"].includes(decision) || typeof reviewNote !== "string" || reviewNote.length > 1000) {
    return res.status(400).json({ error: "Invalid review decision" });
  }
  const application = await db("organization_applications").where({ id }).first();
  if (!application || application.status !== "pending") return res.status(404).json({ error: "Pending application not found" });
  await db.transaction(async (trx) => {
    await trx("organization_applications").where({ id }).update({
      status: decision,
      reviewNote: reviewNote.trim(),
      reviewedBy: req.user.id,
      reviewedAt: trx.fn.now(),
    });
    if (decision === "approved" && roles.has(application.type)) {
      await trx("users").where({ id: application.userId }).update({ role: application.type, updatedAt: trx.fn.now() });
    }
  });
  await audit(req.user.id, "application_review", `${id}:${decision}`);
  return res.json({ id, status: decision });
});

router.get("/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await db("users").select("id", "email", "name", "role", "status", "createdAt").orderBy("createdAt", "desc");
  return res.json(users);
});

router.patch("/admin/users/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const status = req.body?.status;
  if (!Number.isSafeInteger(id) || !["active", "suspended"].includes(status) || id === req.user.id) {
    return res.status(400).json({ error: "Invalid account status change" });
  }
  const changed = await db("users").where({ id }).update({ status, updatedAt: db.fn.now() });
  if (!changed) return res.status(404).json({ error: "User not found" });
  await audit(req.user.id, "user_status", `${id}:${status}`);
  return res.json({ id, status });
});

export default router;
