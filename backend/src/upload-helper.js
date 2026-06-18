import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { config } from "./config.js";

// Initialize Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export function isCloudinaryConfigured() {
  const key = config.cloudinary.apiKey;
  return Boolean(key && !key.startsWith("local_") && !key.startsWith("your_"));
}

export async function uploadImage(dataUrl, folderName) {
  if (isCloudinaryConfigured()) {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: folderName,
      resource_type: "image",
      type: "upload",
    });
    return { secure_url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type };
  } else {
    const url = saveFileLocally(dataUrl, folderName);
    return { secure_url: url, public_id: `local_${folderName}_${crypto.randomUUID()}`, resource_type: "image" };
  }
}

export async function uploadDocument(dataUrl, folderName) {
  if (isCloudinaryConfigured()) {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: folderName,
      resource_type: "auto",
      type: "authenticated",
    });
    return { secure_url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type };
  } else {
    const url = saveFileLocally(dataUrl, folderName);
    const contentType = dataUrl.split(";")[0].split(":")[1] || "";
    const isPdf = contentType.includes("pdf");
    return {
      secure_url: url,
      public_id: `local_${folderName}_${crypto.randomUUID()}`,
      resource_type: isPdf ? "raw" : "image"
    };
  }
}

function saveFileLocally(dataUrl, folderName) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid data URL");
  }
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  
  let ext = "bin";
  if (contentType.includes("jpeg")) ext = "jpg";
  else if (contentType.includes("png")) ext = "png";
  else if (contentType.includes("webp")) ext = "webp";
  else if (contentType.includes("pdf")) ext = "pdf";
  
  const filename = `${folderName}_${crypto.randomUUID()}.${ext}`;
  const uploadDir = path.resolve("./data/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  
  const port = config.port || 4000;
  return `http://localhost:${port}/uploads/${filename}`;
}
