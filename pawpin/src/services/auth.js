const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "pawpin-auth-token";

export function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  return session;
}

export const register = (details) => request("/auth/register", {
  method: "POST",
  body: JSON.stringify(details),
}).then(saveSession);

export const login = (details) => request("/auth/login", {
  method: "POST",
  body: JSON.stringify(details),
}).then(saveSession);

export const googleLogin = (credential) => request("/auth/google", {
  method: "POST",
  body: JSON.stringify({ credential }),
}).then(saveSession);

export const verifyEmail = (token) => request("/auth/verify-email", {
  method: "POST",
  body: JSON.stringify({ token }),
}).then(saveSession);

export const resendVerification = (email) => request("/auth/resend-verification", {
  method: "POST",
  body: JSON.stringify({ email }),
});

export const requestPasswordReset = (email) => request("/auth/forgot-password", {
  method: "POST",
  body: JSON.stringify({ email }),
});

export const resetPassword = (details) => request("/auth/reset-password", {
  method: "POST",
  body: JSON.stringify(details),
});

export const getMe = () => request("/me");

export const updateProfile = (details) => request("/me", {
  method: "PATCH",
  body: JSON.stringify(details),
});

export const uploadProfilePhoto = (dataUrl) => request("/me/photo", {
  method: "POST",
  body: JSON.stringify({ dataUrl }),
});

export const submitApplication = (details) => request("/applications", {
  method: "POST",
  body: JSON.stringify(details),
});

export const uploadApplicationDocument = (dataUrl) => request("/applications/documents", {
  method: "POST",
  body: JSON.stringify({ dataUrl }),
});

export const getApplications = () => request("/admin/applications");

export const reviewApplication = (id, decision, reviewNote = "") => request(`/admin/applications/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ decision, reviewNote }),
});

export const getPoints = () => request("/points");

export const redeemPoints = (pointsAmount, rewardDescription) => request("/points/redeem", {
  method: "POST",
  body: JSON.stringify({ pointsAmount, rewardDescription }),
});

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}
