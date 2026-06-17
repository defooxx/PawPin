import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "./config.js";

let adminAuth = null;

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

export { adminAuth };
