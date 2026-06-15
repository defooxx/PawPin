import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your_")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function positiveInteger(name, fallback) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function allowedOrigins() {
  return (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Add your Vercel URL to Railway → Variables → CORS_ORIGINS
// e.g. CORS_ORIGINS=https://pawpin.vercel.app,http://localhost:5173

function boolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function optional(name) {
  const value = process.env[name]?.trim();
  return value && !value.startsWith("your_") ? value : null;
}

export const config = Object.freeze({
  port: positiveInteger("PORT", 4000),
  dbFile: process.env.DB_FILE?.trim() || "./data/pawpin.db",
  jsonLimit: process.env.JSON_LIMIT?.trim() || "10mb",
  maxImageBytes: positiveInteger("MAX_IMAGE_BYTES", 7 * 1024 * 1024),
  maxDocumentBytes: positiveInteger("MAX_DOCUMENT_BYTES", 10 * 1024 * 1024),
  rateLimitWindowMs: positiveInteger("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  rateLimitMax: positiveInteger("RATE_LIMIT_MAX", 100),
  uploadRateLimitMax: positiveInteger("UPLOAD_RATE_LIMIT_MAX", 20),
  reportRateLimitMax: positiveInteger("REPORT_RATE_LIMIT_MAX", 10),
  duplicateHashDistance: positiveInteger("DUPLICATE_HASH_DISTANCE", 5),
  suspensionThreshold: positiveInteger("SUSPENSION_THRESHOLD", 3),
  enableReportList: boolean("ENABLE_REPORT_LIST"),
  corsOrigins: allowedOrigins(),
  reporterHashSecret: required("REPORTER_HASH_SECRET"),
  shelterApiToken: optional("SHELTER_API_TOKEN"),
  authJwtSecret: required("AUTH_JWT_SECRET"),
  authTokenTtl: process.env.AUTH_TOKEN_TTL?.trim() || "7d",
  googleClientId: optional("GOOGLE_CLIENT_ID"),
  adminEmail: optional("ADMIN_EMAIL")?.toLowerCase() || null,
  adminPassword: optional("ADMIN_PASSWORD"),
  cloudinary: Object.freeze({
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
  }),
});
