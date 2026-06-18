/**
 * MapScreen.jsx — OpenStreetMap via plain Leaflet (no react-leaflet).
 * Avoids the duplicate-React / useState=null issue caused by react-leaflet's
 * own React peer dependency being resolved as a second instance.
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { io } from "socket.io-client";
import { LocationChoiceDialog } from "../components/LocationChoiceDialog.jsx";
import { getCurrentLocation, stopWatchingLocation, watchCurrentLocation } from "../services/location.js";
import { authHeaders } from "../services/auth.js";
import { assignPin, unassignPin } from "../services/api.js";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").replace(/\/$/, "");

async function fetchJSON(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const KATHMANDU = [27.7172, 85.324];

function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50% 50% 50% 0;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24],
  });
}

const ICONS = {
  rescue: makeIcon("#E84C35"),
  lost:   makeIcon("#F5A623"),
  user:   makeIcon("#3E987C"),
};

export function MapScreen({ user, toast }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const userMarkerRef = useRef(null);
  const socketRef     = useRef(null);
  const activeRescuersRef = useRef({});

  const [filter, setFilter]       = useState("all");
  const [rescuePins, setRescuePins] = useState([]);
  const [lostPins, setLostPins]   = useState([]);
  const [locating, setLocating]   = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationChoiceOpen, setLocationChoiceOpen] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchRef = useRef(null);

  const [rescuersData, setRescuersData] = useState({});
  const [eta, setEta] = useState(null);

  const routeLineRef = useRef(null);
  const routeBorderRef = useRef(null);

  const handleAssignRef = useRef(null);
  const handleUnassignRef = useRef(null);

  const updateRescuerMarker = (rescuer) => {
    if (!mapRef.current) return;
    const { userId, name, role, latitude, longitude } = rescuer;
    const coords = [latitude, longitude];
    
    // Choose icon color based on role
    let color = "#3E987C"; // Default teal
    if (role === "admin") color = "#E84C35"; // Red
    else if (role === "shelter") color = "#F5A623"; // Amber
    
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:22px;height:22px;border-radius:50% 50% 50% 0;
        background:${color};border:2.5px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.4);
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
      "><span style="transform:rotate(45deg);font-size:10px;">🐾</span></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -24],
    });

    if (activeRescuersRef.current[userId]) {
      activeRescuersRef.current[userId].setLatLng(coords);
    } else {
      activeRescuersRef.current[userId] = L.marker(coords, { icon })
        .bindPopup(`<strong>${escapeHtml(name)}</strong><br/><span style="font-size:11px;color:#666">${escapeHtml(role)} (Live)</span>`)
        .addTo(mapRef.current);
    }
  };

  const removeRescuerMarker = (userId) => {
    if (activeRescuersRef.current[userId]) {
      activeRescuersRef.current[userId].remove();
      delete activeRescuersRef.current[userId];
    }
  };

  const showUserLocation = (location, animate = true) => {
    if (!mapRef.current) return;
    const coords = [location.latitude, location.longitude];
    if (userMarkerRef.current) userMarkerRef.current.remove();
    userMarkerRef.current = L.marker(coords, { icon: ICONS.user })
      .bindPopup("<strong>You are here</strong>")
      .addTo(mapRef.current);
    userMarkerRef.current.openPopup();
    setUserLocation(location);
    if (animate) mapRef.current.flyTo(coords, 15, { animate: true, duration: 1 });
  };

  const handleAssign = async (kind, id) => {
    if (!user) {
      toast?.("Please log in to respond to cases.");
      return;
    }
    try {
      const result = await assignPin(kind, id);
      toast?.(`You responded to this ${kind}! 🐾`);
      const numId = Number(id);
      if (kind === "rescue") {
        setRescuePins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: user.id, assignedUserName: user.name, status: result.status } : p));
      } else {
        setLostPins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: user.id, assignedUserName: user.name, status: result.status } : p));
      }
    } catch (error) {
      toast?.(error.message);
    }
  };

  const handleUnassign = async (kind, id) => {
    try {
      const result = await unassignPin(kind, id);
      toast?.("Response cancelled.");
      const numId = Number(id);
      if (kind === "rescue") {
        setRescuePins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: null, assignedUserName: null, status: result.status } : p));
      } else {
        setLostPins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: null, assignedUserName: null, status: result.status } : p));
      }
    } catch (error) {
      toast?.(error.message);
    }
  };

  handleAssignRef.current = handleAssign;
  handleUnassignRef.current = handleUnassign;

  const stopSharing = () => {
    stopWatchingLocation(watchRef.current);
    watchRef.current = null;
    
    if (socketRef.current) {
      socketRef.current.emit("stop-sharing");
    }

    setSharingLocation(false);
    setLocating(false);
  };

  // ── initialise Leaflet map and WebSocket connection once ─────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    // Initialize Map
    const map = L.map(containerRef.current, { zoomControl: true }).setView(KATHMANDU, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    // Handle popup buttons
    map.on("popupopen", (e) => {
      const container = e.popup._contentNode;
      if (!container) return;
      const assignBtn = container.querySelector(".pp-popup-assign-btn");
      const unassignBtn = container.querySelector(".pp-popup-unassign-btn");
      
      if (assignBtn) {
        assignBtn.onclick = () => {
          const id = assignBtn.getAttribute("data-id");
          const kind = assignBtn.getAttribute("data-kind");
          handleAssignRef.current?.(kind, id);
        };
      }
      if (unassignBtn) {
        unassignBtn.onclick = () => {
          const id = unassignBtn.getAttribute("data-id");
          const kind = unassignBtn.getAttribute("data-kind");
          handleUnassignRef.current?.(kind, id);
        };
      }
    });

    // Initialize WebSockets
    const socket = io(API_BASE);
    socketRef.current = socket;

    socket.on("active-rescuers", (rescuers) => {
      rescuers.forEach((rescuer) => {
        if (rescuer.userId === user?.id) return;
        updateRescuerMarker(rescuer);
      });
      const dict = {};
      rescuers.forEach(r => { dict[r.userId] = r; });
      setRescuersData(dict);
    });

    socket.on("location-updated", (rescuer) => {
      if (rescuer.userId === user?.id) return;
      updateRescuerMarker(rescuer);
      setRescuersData(prev => ({ ...prev, [rescuer.userId]: rescuer }));
    });

    socket.on("rescuer-left", ({ userId }) => {
      removeRescuerMarker(userId);
      setRescuersData(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on("pin-assigned", ({ id, kind, assignedUserId, assignedUserName, status }) => {
      const numId = Number(id);
      if (kind === "rescue") {
        setRescuePins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId, assignedUserName, status } : p));
      } else {
        setLostPins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId, assignedUserName, status } : p));
      }
    });

    socket.on("pin-unassigned", ({ id, kind, status }) => {
      const numId = Number(id);
      if (kind === "rescue") {
        setRescuePins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: null, assignedUserName: null, status } : p));
      } else {
        setLostPins((prev) => prev.map((p) => p.id === numId ? { ...p, assignedUserId: null, assignedUserName: null, status: "open" } : p));
      }
    });

    return () => {
      stopWatchingLocation(watchRef.current);
      socket.disconnect();
      socketRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [user]);

  // ── fetch pins ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJSON("/map/pins").then((pins) => {
      setRescuePins(pins.filter((pin) => pin.kind === "rescue"));
      setLostPins(pins.filter((pin) => pin.kind === "lost"));
    });
  }, []);

  const activeAssignedRescue = rescuePins.find(p => p.assignedUserId && (p.userId === user?.id || p.assignedUserId === user?.id));
  const activeAssignedLost = lostPins.find(p => p.assignedUserId && (p.userId === user?.id || p.assignedUserId === user?.id));
  const activeNavigationPin = activeAssignedRescue || activeAssignedLost;

  let rescuerLat = null;
  let rescuerLng = null;
  if (activeNavigationPin) {
    if (activeNavigationPin.assignedUserId === user?.id) {
      if (userLocation) {
        rescuerLat = userLocation.latitude;
        rescuerLng = userLocation.longitude;
      }
    } else {
      const rescuer = rescuersData[activeNavigationPin.assignedUserId];
      if (rescuer) {
        rescuerLat = rescuer.latitude;
        rescuerLng = rescuer.longitude;
      }
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    if (routeBorderRef.current) {
      routeBorderRef.current.remove();
      routeBorderRef.current = null;
    }
    setEta(null);

    if (!activeNavigationPin || rescuerLat === null || rescuerLng === null) {
      return;
    }

    const start = [rescuerLat, rescuerLng];
    const end = [activeNavigationPin.latitude, activeNavigationPin.longitude];

    let active = true;

    async function fetchRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${rescuerLng},${rescuerLat};${activeNavigationPin.longitude},${activeNavigationPin.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM routing failed");
        const data = await res.json();
        
        if (!active) return;
        if (!data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }

        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const durationSec = route.duration;

        if (mapRef.current) {
          routeBorderRef.current = L.polyline(coordinates, {
            color: "#000000",
            weight: 8,
            opacity: 0.6,
          }).addTo(mapRef.current);

          routeLineRef.current = L.polyline(coordinates, {
            color: "#ffffff",
            weight: 4,
            opacity: 0.9,
          }).addTo(mapRef.current);
          
          mapRef.current.fitBounds(L.latLngBounds(start, end).pad(0.2));
        }

        const durationMin = Math.round(durationSec / 60);
        setEta(durationMin);
      } catch (err) {
        console.warn("Routing failed, falling back to straight line:", err.message);
        if (!active) return;

        if (mapRef.current) {
          routeBorderRef.current = L.polyline([start, end], {
            color: "#000000",
            weight: 8,
            opacity: 0.6,
          }).addTo(mapRef.current);

          routeLineRef.current = L.polyline([start, end], {
            color: "#ffffff",
            weight: 4,
            opacity: 0.9,
          }).addTo(mapRef.current);
          
          mapRef.current.fitBounds(L.latLngBounds(start, end).pad(0.2));
        }

        const distMeters = mapRef.current ? mapRef.current.distance(start, end) : 1000;
        const durationMin = Math.max(1, Math.round((distMeters / 1000) * 2));
        setEta(durationMin);
      }
    }

    fetchRoute();

    return () => {
      active = false;
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      if (routeBorderRef.current) {
        routeBorderRef.current.remove();
        routeBorderRef.current = null;
      }
    };
  }, [activeNavigationPin, rescuerLat, rescuerLng]);

  // ── redraw markers when data or filter changes ────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const showRescue = filter === "all" || filter === "rescue";
    const showLost   = filter === "all" || filter === "lost";

    if (showRescue) {
      rescuePins.forEach((r) => {
        const latitude = Number(r.latitude);
        const longitude = Number(r.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const tags = Array.isArray(r.tags) ? r.tags.join(", ") : (r.tags || "");
        
        let popupHtml = `<div style="min-width: 140px;">
          <strong>🆘 Rescue #${r.id}</strong><br/>
          <span style="font-size:11px;color:#666">${escapeHtml(tags)}</span><br/>`;
        
        if (r.assignedUserId) {
          popupHtml += `<span style="font-size:11px;color:var(--sage);font-weight:700;">Assigned to: ${escapeHtml(r.assignedUserName)}</span><br/>`;
          if (r.assignedUserId === user?.id) {
            popupHtml += `<button class="pp-popup-unassign-btn pp-btn pp-btn-ghost" style="padding:4px 8px;font-size:11px;margin-top:6px;width:100%;height:auto;" data-kind="rescue" data-id="${r.id}">Cancel Response</button>`;
          }
        } else if (user) {
          if (r.userId !== user.id) {
            popupHtml += `<button class="pp-popup-assign-btn pp-btn pp-btn-amber" style="padding:4px 8px;font-size:11px;margin-top:6px;width:100%;height:auto;color:#fff;" data-kind="rescue" data-id="${r.id}">Accept Rescue</button>`;
          } else {
            popupHtml += `<span style="font-size:11px;color:#999;font-weight:700;">Posted by you</span>`;
          }
        } else {
          popupHtml += `<span style="font-size:10px;color:#999;">Log in to respond</span>`;
        }
        
        popupHtml += `<br/><span style="font-size:10px;color:#999;">${new Date(r.createdAt).toLocaleDateString()}</span></div>`;

        const m = L.marker([latitude, longitude], { icon: ICONS.rescue })
          .bindPopup(popupHtml)
          .addTo(mapRef.current);
        markersRef.current.push(m);
      });
    }

    if (showLost) {
      lostPins.forEach((p) => {
        const latitude = Number(p.latitude);
        const longitude = Number(p.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const label = p.type === "found" ? "Found" : "Lost";
        const name  = p.petName || p.species || "Pet";
        
        let popupHtml = `<div style="min-width: 140px;">
          <strong>🔍 ${label}: ${escapeHtml(name)}</strong><br/>
          <span style="font-size:11px;color:#666">${escapeHtml(p.area)}</span><br/>
          <span style="font-size:11px;color:#666">Posted by ${escapeHtml(p.postedBy || "unknown")}</span><br/>`;
        
        if (p.assignedUserId) {
          popupHtml += `<span style="font-size:11px;color:var(--sage);font-weight:700;">Helper: ${escapeHtml(p.assignedUserName)}</span><br/>`;
          if (p.assignedUserId === user?.id) {
            popupHtml += `<button class="pp-popup-unassign-btn pp-btn pp-btn-ghost" style="padding:4px 8px;font-size:11px;margin-top:6px;width:100%;height:auto;" data-kind="lost" data-id="${p.id}">Cancel Response</button>`;
          }
        } else if (user) {
          if (p.userId !== user.id) {
            popupHtml += `<button class="pp-popup-assign-btn pp-btn pp-btn-amber" style="padding:4px 8px;font-size:11px;margin-top:6px;width:100%;height:auto;color:#fff;" data-kind="lost" data-id="${p.id}">Help Find</button>`;
          } else {
            popupHtml += `<span style="font-size:11px;color:#999;font-weight:700;">Posted by you</span>`;
          }
        } else {
          popupHtml += `<span style="font-size:10px;color:#999;">Log in to respond</span>`;
        }

        popupHtml += `</div>`;

        const m = L.marker([latitude, longitude], { icon: ICONS.lost })
          .bindPopup(popupHtml)
          .addTo(mapRef.current);
        markersRef.current.push(m);
      });
    }
  }, [filter, rescuePins, lostPins, user]);

  // ── locate me ─────────────────────────────────────────────────────────────
  const useLocation = async (mode) => {
    setLocationChoiceOpen(false);
    stopSharing();
    setLocating(true);
    try {
      if (mode === "share") {
        let firstUpdate = true;
        watchRef.current = watchCurrentLocation(
          (location) => {
            showUserLocation(location, firstUpdate);

            // Emit location coordinates to other rescuers using the persistent socket connection
            if (socketRef.current) {
              socketRef.current.emit("update-location", {
                userId: user?.id || "anonymous",
                name: user?.name || "Anonymous Rescuer",
                role: user?.role || "user",
                latitude: location.latitude,
                longitude: location.longitude,
              });
            }

            firstUpdate = false;
            setSharingLocation(true);
            setLocating(false);
          },
          (error) => {
            stopSharing();
            toast?.(error.message);
          },
        );
      } else {
        showUserLocation(await getCurrentLocation());
        setLocating(false);
      }
    } catch (error) {
      setLocating(false);
      toast?.(error.message);
    }
  };

  const userReports = rescuePins.filter(p => p.userId === user?.id && p.status !== "resolved" && p.status !== "abusive");
  const userLostPosts = lostPins.filter(p => p.userId === user?.id && p.status !== "reunited");
  const allUserPins = [...userReports, ...userLostPosts];

  const nearbyRescuersCount = Object.values(rescuersData).filter(rescuer => {
    return allUserPins.some(pin => {
      const lat1 = rescuer.latitude;
      const lon1 = rescuer.longitude;
      const lat2 = pin.latitude;
      const lon2 = pin.longitude;
      
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c;
      return d <= 5;
    });
  }).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", height: "100%" }}>

      {/* Filter bar */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 12px", background: "#fff",
        borderBottom: "1px solid var(--line)", flexWrap: "wrap", flexShrink: 0,
      }}>
        {[["all", "All pins"], ["rescue", "🆘 Rescue"], ["lost", "🔍 Lost"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "5px 14px", borderRadius: 20, border: "1.5px solid var(--line)",
            fontWeight: 700, fontSize: 12, cursor: "pointer",
            background: filter === id ? "var(--amber)" : "transparent",
            color: filter === id ? "#fff" : "var(--ink)",
          }}>{label}</button>
        ))}
        <button onClick={() => sharingLocation ? stopSharing() : setLocationChoiceOpen(true)} disabled={locating} style={{
          marginLeft: "auto", padding: "5px 14px", borderRadius: 20,
          border: "1.5px solid var(--sage)", background: "var(--sage-soft)",
          color: "var(--sage)", fontWeight: 700, fontSize: 12, cursor: "pointer",
          opacity: locating ? 0.5 : 1,
        }}>{locating ? "Locating…" : sharingLocation ? "Stop sharing" : "📍 My location"}</button>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, padding: "6px 14px", background: "var(--bg)",
        borderBottom: "1px solid var(--line)", flexShrink: 0, flexWrap: "wrap",
        alignItems: "center"
      }}>
        {[
          { color: "#E84C35", label: `${rescuePins.length} rescue` },
          { color: "#F5A623", label: `${lostPins.length} lost` },
          { color: "#3E987C", label: "You" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink-soft)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
        {allUserPins.length > 0 && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--sage)", fontWeight: 700 }}>
            🟢 {nearbyRescuersCount} nearby rescuer{nearbyRescuersCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Map container — Leaflet mounts here */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      
      {/* Route Status Banner (iOS map widget inspired) */}
      {activeNavigationPin && (
        <div style={{
          position: "absolute",
          top: 65,
          left: 12,
          right: 12,
          backgroundColor: "rgba(58, 42, 34, 0.95)",
          color: "#fff",
          borderRadius: 18,
          padding: "14px 16px",
          zIndex: 1000,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "grid", placeItems: "center", fontSize: 13
            }}>🏃</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase" }}>
                {activeNavigationPin.assignedUserId === user?.id ? "Rescuer (You)" : "Rescuer"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {activeNavigationPin.assignedUserId === user?.id ? user?.name : activeNavigationPin.assignedUserName || "Assigned Responder"}
              </div>
            </div>
            <button
              onClick={() => handleUnassign(activeNavigationPin.kind, activeNavigationPin.id)}
              style={{
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12,
                color: "#ff7a59", padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
          
          <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "grid", placeItems: "center", fontSize: 13
            }}>🏁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase" }}>
                Destination
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {activeNavigationPin.kind === "rescue" ? `Rescue #${activeNavigationPin.id}` : `Lost: ${activeNavigationPin.petName}`}
                {eta !== null && <span style={{ color: "var(--amber)", marginLeft: 8, fontWeight: 700 }}>~{eta} min</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {userLocation && (
        <div className="pp-location-confirmation">
          Your location: {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
        </div>
      )}
      <LocationChoiceDialog open={locationChoiceOpen} onClose={() => setLocationChoiceOpen(false)} onChoose={useLocation} />

    </div>
  );
}
