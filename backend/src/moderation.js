import crypto from "crypto";
import { ipKeyGenerator } from "express-rate-limit";
import sharp from "sharp";
import db from "./db.js";
import { config } from "./config.js";

export function reporterKey(req) {
  // Use authenticated user ID if available — cannot be spoofed.
  // Fall back to IP address for anonymous requests.
  // The old X-PawPin-Reporter-ID header was client-controlled and has been removed.
  const source = req.user
    ? `user:${req.user.id}`
    : `ip:${ipKeyGenerator(req.ip)}`;
  return crypto.createHmac("sha256", config.reporterHashSecret).update(source).digest("hex");
}

export async function imageFingerprint(base64) {
  const pixels = await sharp(Buffer.from(base64.replace(/\s/g, ""), "base64"))
    .greyscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  return [...pixels].map((value) => value >= average ? "1" : "0").join("");
}

export function hammingDistance(left, right) {
  if (!left || !right || left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

export async function reporterIsSuspended(key) {
  const reporter = await db("reporters").where({ reporterKey: key }).first();
  return Boolean(reporter?.suspendedAt);
}

export async function ensureReporter(key) {
  const exists = await db("reporters").where({ reporterKey: key }).first();
  if (!exists) {
    await db("reporters").insert({ reporterKey: key });
  }
}

// Scan only the most recent 500 reports to avoid loading the entire table into
// memory on every submission. Older duplicates are unlikely to matter in practice
// and this keeps the check O(1) in memory regardless of total report count.
const DUPLICATE_SCAN_LIMIT = 500;

export async function findDuplicate(fingerprint) {
  const reports = await db("reports")
    .whereNotNull("imageFingerprint")
    .orderBy("createdAt", "desc")
    .limit(DUPLICATE_SCAN_LIMIT)
    .select("id", "imageFingerprint");
  let closest = null;
  for (const report of reports) {
    const distance = hammingDistance(fingerprint, report.imageFingerprint);
    if (distance <= config.duplicateHashDistance && (!closest || distance < closest.distance)) {
      closest = { reportId: report.id, distance };
    }
  }
  return closest;
}

export async function recordModeration({ report, action, reason, shelterId }) {
  await db.transaction(async (trx) => {
    const priorConfirmation = await trx("moderation_actions")
      .where({ reportId: report.id })
      .whereIn("action", ["false", "abusive"])
      .first();

    await trx("moderation_actions").insert({
      reportId: report.id,
      action,
      reason,
      shelterId,
    });

    const status = action === "clear" ? "pending" : action;
    await trx("reports").where({ id: report.id }).update({
      status,
      lastStatusNote: action === "clear" ? "Report cleared for responder dispatch." : reason,
      reviewReason: action === "clear" ? null : reason,
      reviewedAt: trx.fn.now(),
      updatedAt: trx.fn.now(),
    });

    await trx("report_status_events").insert({
      reportId: report.id,
      status,
      note: action === "clear" ? "Report cleared for responder dispatch." : reason,
      changedBy: null,
    });

    if ((action === "false" || action === "abusive") && !priorConfirmation) {
      await trx("reporters").where({ reporterKey: report.reporterKey }).increment("confirmedAbuseCount", 1);
      const reporter = await trx("reporters").where({ reporterKey: report.reporterKey }).first();
      if (reporter.confirmedAbuseCount >= config.suspensionThreshold) {
        await trx("reporters").where({ reporterKey: report.reporterKey }).update({ suspendedAt: trx.fn.now() });
      }
    }
  });
}
