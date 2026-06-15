/**
 * MapScreen.jsx — OpenStreetMap via plain Leaflet (no react-leaflet).
 * Avoids the duplicate-React / useState=null issue caused by react-leaflet's
 * own React peer dependency being resolved as a second instance.
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").replace(/\/$/, "");

async function fetchJSON(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
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

export function MapScreen({ toast }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const userMarkerRef = useRef(null);

  const [filter, setFilter]       = useState("all");
  const [rescuePins, setRescuePins] = useState([]);
  const [lostPins, setLostPins]   = useState([]);
  const [locating, setLocating]   = useState(false);

  // ── initialise Leaflet map once ──────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(KATHMANDU, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── fetch pins ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJSON("/reports").then(setRescuePins);
    fetchJSON("/lost?status=open").then(setLostPins);
  }, []);

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
        if (!r.latitude || !r.longitude) return;
        const m = L.marker([r.latitude, r.longitude], { icon: ICONS.rescue })
          .bindPopup(`
            <strong>🆘 Rescue #${r.id}</strong><br/>
            <span style="font-size:11px;color:#666">${Array.isArray(r.tags) ? r.tags.join(", ") : (r.tags || "")}</span><br/>
            <span style="font-size:10px;color:#999">${new Date(r.createdAt).toLocaleDateString()}</span>
          `)
          .addTo(mapRef.current);
        markersRef.current.push(m);
      });
    }

    if (showLost) {
      lostPins.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const label = p.type === "found" ? "Found" : "Lost";
        const name  = p.petName || p.species || "Pet";
        const m = L.marker([p.latitude, p.longitude], { icon: ICONS.lost })
          .bindPopup(`
            <strong>🔍 ${label}: ${name}</strong><br/>
            <span style="font-size:11px;color:#666">${p.area || ""}</span><br/>
            <span style="font-size:11px;color:#666">Posted by ${p.postedBy || "unknown"}</span>
          `)
          .addTo(mapRef.current);
        markersRef.current.push(m);
      });
    }
  }, [filter, rescuePins, lostPins]);

  // ── locate me ─────────────────────────────────────────────────────────────
  const locateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        if (userMarkerRef.current) userMarkerRef.current.remove();
        userMarkerRef.current = L.marker(coords, { icon: ICONS.user })
          .bindPopup("<strong>You are here</strong>")
          .addTo(mapRef.current);
        mapRef.current.flyTo(coords, 15, { animate: true, duration: 1 });
        setLocating(false);
      },
      () => { toast?.("Could not get your location"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div style={{ margin: "-16px -16px -22px", display: "flex", flexDirection: "column" }}>

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
        <button onClick={locateMe} disabled={locating} style={{
          marginLeft: "auto", padding: "5px 14px", borderRadius: 20,
          border: "1.5px solid var(--sage)", background: "var(--sage-soft)",
          color: "var(--sage)", fontWeight: 700, fontSize: 12, cursor: "pointer",
          opacity: locating ? 0.5 : 1,
        }}>{locating ? "Locating…" : "📍 My location"}</button>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, padding: "6px 14px", background: "var(--bg)",
        borderBottom: "1px solid var(--line)", flexShrink: 0, flexWrap: "wrap",
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
      </div>

      {/* Map container — Leaflet mounts here */}
      <div ref={containerRef} style={{ height: 510 }} />

    </div>
  );
}
