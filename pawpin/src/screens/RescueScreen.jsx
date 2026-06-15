import { useEffect, useRef, useState } from "react";
import { Bell, Building2, Camera, Check, Navigation, PawPrint, Phone, Plus } from "lucide-react";
import L from "leaflet";
import { fade, RESCUE_ISSUES, SHELTERS } from "../data.js";
import { createReport, uploadReportPhoto } from "../services/api.js";
import { getCurrentLocation } from "../services/location.js";

const KATHMANDU = [27.7172, 85.324];

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:#E84C35;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.4);
    transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
  "><span style="transform:rotate(45deg);font-size:14px">🐾</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
});

/** Plain-Leaflet mini-map for picking a rescue location. No react-leaflet. */
function RescueMiniMap({ pin, onPin }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  // Initialise map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView(KATHMANDU, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => {
      onPin([e.latlng.lat, e.latlng.lng]);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker + pan when pin changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (pin) {
      markerRef.current = L.marker(pin, { icon: pinIcon }).addTo(mapRef.current);
      mapRef.current.flyTo(pin, 15, { animate: true, duration: 0.8 });
    }
  }, [pin]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 220, borderRadius: 16, overflow: "hidden", border: "1.5px solid var(--line)" }}
    />
  );
}

export function RescueScreen({ toast }) {
  const [photo, setPhoto]   = useState(null);
  const [issues, setIssues] = useState([]);
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [pin, setPin]       = useState(null); // [lat, lng]
  const fileRef = useRef(null);

  const toggleIssue = (issue) =>
    setIssues((cur) => cur.includes(issue) ? cur.filter((i) => i !== issue) : [...cur, issue]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const locateMe = async () => {
    try {
      const loc = await getCurrentLocation();
      setPin([loc.latitude, loc.longitude]);
      toast("Location pinned 📍");
    } catch {
      toast("Could not get your location");
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!photo)   { toast("Add a photo before sending the report"); return; }
    if (!issues.length) { toast("Select at least one issue before sending"); return; }
    if (!pin)     { toast("Tap the map to drop a pin, or use your current location"); return; }

    setLoading(true);
    try {
      const photoUrl = await uploadReportPhoto(photo);
      await createReport({ photoUrl, location: { latitude: pin[0], longitude: pin[1] }, tags: issues });
      toast("Report submitted — help is on the way!");
      setSent(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "Network error sending report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSent(false); setPhoto(null); setIssues([]); setPin(null); };

  if (sent) {
    return (
      <div style={fade}>
        <div className="pp-result" style={{ background: "linear-gradient(135deg,#48B08F,var(--sage))", marginTop: 6 }}>
          <Check size={30} />
          <div className="pp-fred" style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Help is on the way</div>
          <div style={{ fontSize: 13.5, opacity: .95, marginTop: 4 }}>3 shelters near the pin were notified. Sunny Tails Rescue accepted — ETA ~12 min.</div>
        </div>
        <h2 className="pp-h2" style={{ margin: "20px 0 10px" }}>Responding</h2>
        {SHELTERS.map((shelter, i) => (
          <div key={shelter.name} className="pp-listcard" style={{ marginBottom: 10 }}>
            <div className="pp-thumb" style={{ background: i === 0 ? "var(--sage-soft)" : "var(--bg)", color: "var(--sage)" }}><Building2 size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{shelter.name}</div>
              <div className="pp-sub" style={{ fontSize: 12 }}>{shelter.dist} · {shelter.note}</div>
            </div>
            {i === 0
              ? <span className="pp-pill" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>On the way</span>
              : <button className="pp-icobtn" aria-label={`Call ${shelter.name}`}><Phone size={17} color="var(--sage)" /></button>}
          </div>
        ))}
        <button className="pp-btn pp-btn-ghost" style={{ marginTop: 6 }} onClick={reset}>Report another animal</button>
      </div>
    );
  }

  return (
    <div style={fade}>
      <h1 className="pp-h1">Report an animal</h1>
      <p className="pp-sub" style={{ marginTop: 4, marginBottom: 16 }}>Three quick steps. The closest shelter gets your pin in seconds.</p>

      <div className="pp-fred" style={{ fontWeight: 600, marginBottom: 8 }}>1 · Add a photo</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button className={"pp-photoslot" + (photo ? " filled" : "")} onClick={() => fileRef.current?.click()}>
          {photo ? (
            <span style={{ width: "100%", height: "100%", borderRadius: 18, overflow: "hidden" }}>
              <img src={photo} alt="Animal report preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </span>
          ) : (
            <><Camera size={26} /><span style={{ fontSize: 12, fontWeight: 800 }}>Take photo</span></>
          )}
        </button>
        <button className="pp-photoslot" onClick={() => fileRef.current?.click()} style={{ borderColor: "#E7C9A6", background: "var(--bg)" }}>
          <Plus size={24} /><span style={{ fontSize: 12, fontWeight: 800 }}>From gallery</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
      </div>

      <div className="pp-fred" style={{ fontWeight: 600, margin: "18px 0 8px" }}>2 · What&apos;s wrong?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {RESCUE_ISSUES.map((issue) => (
          <button key={issue} className={"pp-chip" + (issues.includes(issue) ? " on" : "")} onClick={() => toggleIssue(issue)}>{issue}</button>
        ))}
      </div>

      <div className="pp-fred" style={{ fontWeight: 600, margin: "18px 0 8px" }}>3 · Drop the pin</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
        Tap anywhere on the map to pin the exact location, or use your GPS.
      </p>

      <RescueMiniMap pin={pin} onPin={setPin} />

      {pin && (
        <div style={{ fontSize: 12, color: "var(--sage)", fontWeight: 700, marginTop: 6 }}>
          📍 Pin: {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
        </div>
      )}
      <button className="pp-btn pp-btn-ghost" style={{ marginTop: 10, fontSize: 13.5 }} onClick={locateMe}>
        <Navigation size={16} /> Use my current location
      </button>

      <button className="pp-btn pp-btn-sos" style={{ marginTop: 14, opacity: loading ? .65 : 1 }} disabled={loading} onClick={handleSubmit}>
        <Bell size={18} /> {loading ? "Sending report..." : "Alert nearest shelter"}
      </button>
    </div>
  );
}
