import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import db from "./db.js";
import { config } from "./config.js";

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

export function publicUser(user) {
  const isSyntheticEmail = typeof user.email === "string" && user.email.endsWith("@pawpin.internal");
  return {
    id: user.id,
    email: isSyntheticEmail ? null : (user.email || null),
    name: user.name,
    photoUrl: user.photoUrl,
    location: user.location,
    role: user.role,
    accountType: user.accountType || "user",
    pointsBalance: user.pointsBalance,
    status: user.status,
    emailVerified: isSyntheticEmail ? false : Boolean(user.emailVerified),
    phoneNumber: user.phoneNumber || null,
    phoneVerified: Boolean(user.phoneVerified),
    locationConsent: user.locationConsent || "ask",
    createdAt: user.createdAt,
  };
}

export function issueToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    config.authJwtSecret,
    { expiresIn: config.authTokenTtl },
  );
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function resolveUser(token) {
  const payload = jwt.verify(token, config.authJwtSecret);
  const user = await db("users").where({ id: Number(payload.sub) }).first();
  if (!user || user.status !== "active") return null;
  return user;
}

export async function optionalAuth(req, res, next) {
  const token = req.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
    return req.user ? next() : res.status(401).json({ error: "Account is unavailable" });
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: "Sign in required" });
    return next();
  });
}

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: "You do not have permission for this action" });
}

export function requireVerifiedEmail(req, res, next) {
  return req.user?.emailVerified
    ? next()
    : res.status(403).json({ error: "Verify your email before continuing" });
}

export async function verifyGoogleCredential(credential) {
  if (!googleClient) throw new Error("Google sign-in is not configured");
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: config.googleClientId,
  });
  return ticket.getPayload();
}
