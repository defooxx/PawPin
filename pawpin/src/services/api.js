import { authHeaders } from "./auth.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

function requestHeaders() {
  return {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
}

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function uploadReportPhoto(photo) {
  if (!photo?.startsWith("data:")) {
    throw new Error("Add a photo before sending the report");
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ dataUrl: photo }),
  });
  const uploaded = await readResponse(response);
  return uploaded.url;
}

export async function createReport({ photoUrl, location, tags }) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Choose a valid location before sending the report");
  }
  const response = await fetch(`${API_BASE}/reports`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({
      photoUrl,
      latitude,
      longitude,
      tags,
      notes: "Report created from PawPin web app",
    }),
  });
  return readResponse(response);
}

export async function assignPin(kind, id) {
  const response = await fetch(`${API_BASE}/map/pins/${kind}/${id}/assign`, {
    method: "POST",
    headers: requestHeaders(),
  });
  return readResponse(response);
}

export async function unassignPin(kind, id) {
  const response = await fetch(`${API_BASE}/map/pins/${kind}/${id}/unassign`, {
    method: "POST",
    headers: requestHeaders(),
  });
  return readResponse(response);
}
