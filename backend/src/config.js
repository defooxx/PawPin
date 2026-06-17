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

const requiredEnvironment = [
  "REPORTER_HASH_SECRET",
  "AUTH_JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missingEnvironment = requiredEnvironment.filter((name) => {
  const value = process.env[name]?.trim();
  return !value || value.startsWith("your_");
});
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
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

function unquote(value) {
  return typeof value === "string" ? value.trim().replace(/^["']|["']$/g, "") : value;
}

function tokenTtl() {
  const value = unquote(process.env.AUTH_TOKEN_TTL || "7d");
  if (!/^\d+(ms|s|m|h|d|w|y)?$/.test(value)) {
    console.warn(`Invalid AUTH_TOKEN_TTL "${value}". Falling back to 7d.`);
    return "7d";
  }
  return value;
}

export const config = Object.freeze({
  port: positiveInteger("PORT", 4000),
  frontendUrl: optional("FRONTEND_URL"),
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
  authTokenTtl: tokenTtl(),
  authOneTimeTokenMinutes: positiveInteger("AUTH_ONE_TIME_TOKEN_MINUTES", 30),
  exposeAuthTokens: boolean("EXPOSE_AUTH_TOKENS", false),
  googleClientId: optional("GOOGLE_CLIENT_ID"),
  adminEmail: optional("ADMIN_EMAIL")?.toLowerCase() || null,
  adminPassword: optional("ADMIN_PASSWORD"),
  cloudinary: Object.freeze({
    cloudName: required("CLOUDINARY_CLOUD_NAME"),
    apiKey: required("CLOUDINARY_API_KEY"),
    apiSecret: required("CLOUDINARY_API_SECRET"),
  }),
  email: Object.freeze({
    resendApiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM"),
  }),
});
