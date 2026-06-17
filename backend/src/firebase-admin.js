import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "./config.js";

let adminAuth = null;

if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }
  adminAuth = getAuth();
}

export { adminAuth };
