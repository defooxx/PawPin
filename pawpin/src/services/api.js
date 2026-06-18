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

export async function getAdoptionMeetings() {
  const response = await fetch(`${API_BASE}/adopt/meetings`, {
    headers: requestHeaders(),
  });
  return readResponse(response);
}

export async function createAdoptionMeeting(details) {
  const response = await fetch(`${API_BASE}/adopt/meetings`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(details),
  });
  return readResponse(response);
}

export async function updateAdoptionMeeting(id, status) {
  const response = await fetch(`${API_BASE}/adopt/meetings/${id}`, {
    method: "PATCH",
    headers: requestHeaders(),
    body: JSON.stringify({ status }),
  });
  return readResponse(response);
}

export async function getConsultations() {
  const response = await fetch(`${API_BASE}/consultations`, {
    headers: requestHeaders(),
  });
  return readResponse(response);
}

export async function createConsultation(details) {
  const response = await fetch(`${API_BASE}/consultations`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(details),
  });
  return readResponse(response);
}

export async function updateConsultation(id, status) {
  const response = await fetch(`${API_BASE}/consultations/${id}`, {
    method: "PATCH",
    headers: requestHeaders(),
    body: JSON.stringify({ status }),
  });
  return readResponse(response);
}

export async function getAdoptableAnimals(species, status = "available") {
  let url = `${API_BASE}/adopt?status=${status}`;
  if (species) url += `&species=${species}`;
  const response = await fetch(url);
  return readResponse(response);
}

export async function createAdoptableAnimal(details) {
  let photoUrl = details.photoUrl;
  if (photoUrl?.startsWith("data:")) {
    photoUrl = await uploadReportPhoto(photoUrl);
  }
  const response = await fetch(`${API_BASE}/adopt`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ ...details, photoUrl }),
  });
  return readResponse(response);
}

export async function getMapPins() {
  const response = await fetch(`${API_BASE}/map/pins`, {
    headers: requestHeaders(),
  });
  return readResponse(response);
}

export async function resolvePin(kind, id) {
  const response = await fetch(`${API_BASE}/map/pins/${kind}/${id}/resolve`, {
    method: "POST",
    headers: requestHeaders(),
  });
  return readResponse(response);
}

