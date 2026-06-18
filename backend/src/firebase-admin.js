import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";

let adminAuth = null;
const firebaseTokenClient = new OAuth2Client();
let firebaseCertCache = null;
let firebaseCertCacheExpiresAt = 0;

function serviceAccount() {
  if (config.firebase.serviceAccountJson) {
    try {
      const parsed = JSON.parse(config.firebase.serviceAccountJson);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (error) {
      console.warn(`Firebase phone auth disabled: FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON (${error.message})`);
      return null;
    }
  }
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    return {
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    };
  }
  return null;
}

const credential = serviceAccount();

if (credential) {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert(credential),
      });
    }
    adminAuth = getAuth();
  } catch (error) {
    console.warn(`Firebase phone auth disabled: ${error.message}`);
  }
}

async function firebaseCerts() {
  const now = Date.now();
  if (firebaseCertCache && firebaseCertCacheExpiresAt > now) return firebaseCertCache;

  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error(`Firebase public certs unavailable (${response.status})`);
  firebaseCertCache = await response.json();

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  firebaseCertCacheExpiresAt = now + Math.max(60, maxAgeSeconds - 60) * 1000;
  return firebaseCertCache;
}

export function isFirebasePhoneAuthConfigured() {
  return Boolean(adminAuth || config.firebase.projectId);
}

export async function verifyFirebasePhoneIdToken(idToken) {
  if (adminAuth) return adminAuth.verifyIdToken(idToken);
  if (!config.firebase.projectId) throw new Error("Phone auth not configured");

  const issuer = `https://securetoken.google.com/${config.firebase.projectId}`;
  const ticket = await firebaseTokenClient.verifySignedJwtWithCertsAsync(
    idToken,
    await firebaseCerts(),
    config.firebase.projectId,
    [issuer],
  );
  return ticket.getPayload();
}

export { adminAuth };
