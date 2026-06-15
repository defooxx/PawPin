import crypto from "crypto";

export const accountTypes = new Set(["user", "shelter", "vet"]);
export const locationConsentValues = new Set(["ask", "once", "while_using"]);

export function cleanEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function validPassword(password) {
  return typeof password === "string"
    && password.length >= 10
    && password.length <= 128
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);
}

export function createOneTimeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashOneTimeToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function validRegistrationConsent({ acceptTerms, acceptPrivacy, locationConsent }) {
  return acceptTerms === true
    && acceptPrivacy === true
    && locationConsentValues.has(locationConsent);
}
