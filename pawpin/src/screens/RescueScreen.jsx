import { useEffect, useRef, useState } from "react";
import { Bell, Building2, Camera, Check, Navigation, PawPrint, Phone, Plus } from "lucide-react";
import L from "leaflet";
import { fade, RESCUE_ISSUES, SHELTERS } from "../data.js";
import { LocationChoiceDialog } from "../components/LocationChoiceDialog.jsx";
import { createReport, uploadReportPhoto, getMapPins, assignPin, unassignPin, resolvePin } from "../services/api.js";
import { getCurrentLocation, stopWatchingLocation, watchCurrentLocation } from "../services/location.js";

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
      markerRef.current = L.marker(pin, { icon: pinIcon }).bindPopup("<strong>Animal location pinned here</strong>").addTo(mapRef.current);
      markerRef.current.openPopup();
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

export function RescueScreen({ toast, user }) {
  const [photo, setPhoto]   = useState(null);
  const [issues, setIssues] = useState([]);
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [pin, setPin]       = useState(null); // [lat, lng]
  const [locationChoiceOpen, setLocationChoiceOpen] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef(null);
  const watchRef = useRef(null);

  // Shelter state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const pins = await getMapPins();
      const rescueReports = pins.filter(p => p.kind === "rescue");
      setReports(rescueReports);
    } catch (err) {
      toast(err.message || "Failed to load rescue reports");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (user?.role === "shelter") {
      fetchReports();
    }
  }, [user]);

  const handleAssignReport = async (reportId) => {
    try {
      await assignPin("rescue", reportId);
      toast("Rescue request accepted! Drive safely. 🐾");
      fetchReports();
    } catch (err) {
      toast(err.message || "Failed to accept rescue request");
    }
  };

  const handleUnassignReport = async (reportId) => {
    try {
      await unassignPin("rescue", reportId);
      toast("Cancelled assignment.");
      fetchReports();
    } catch (err) {
      toast(err.message || "Failed to cancel assignment");
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await resolvePin("rescue", reportId);
      toast("Rescue case marked as resolved! Great job! 🎉");
      fetchReports();
    } catch (err) {
      toast(err.message || "Failed to resolve rescue request");
    }
  };

  const stopSharing = () => {
    stopWatchingLocation(watchRef.current);
    watchRef.current = null;
    setSharingLocation(false);
  };

  useEffect(() => () => {
    stopWatchingLocation(watchRef.current);
    watchRef.current = null;
  }, []);

  const toggleIssue = (issue) =>
    setIssues((cur) => cur.includes(issue) ? cur.filter((i) => i !== issue) : [...cur, issue]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const useLocation = async (mode) => {
    setLocationChoiceOpen(false);
    stopSharing();
    setLocating(true);
    try {
      if (mode === "share") {
        watchRef.current = watchCurrentLocation(
          (loc) => {
            setPin([loc.latitude, loc.longitude]);
            setSharingLocation(true);
            setLocating(false);
          },
          (error) => {
            stopSharing();
            setLocating(false);
            toast(error.message);
          },
        );
        return;
      }
      const location = await getCurrentLocation();
      setPin([location.latitude, location.longitude]);
      toast("Current location pinned");
    } catch (error) {
      toast(error.message);
    } finally {
      if (mode !== "share") setLocating(false);
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

  const reset = () => { stopSharing(); setSent(false); setPhoto(null); setIssues([]); setPin(null); };

  if (user?.role === "shelter") {
    return (
      <div style={fade}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 className="pp-h1" style={{ margin: 0 }}>Rescue Dispatch</h1>
          <button className="pp-btn pp-btn-ghost" style={{ width: "auto", padding: "8px 12px", borderRadius: 12, fontSize: 13, border: "1px solid var(--line)" }} onClick={fetchReports} disabled={loadingReports}>
            {loadingReports ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <p className="pp-sub" style={{ marginTop: 2, marginBottom: 16 }}>Manage active rescue requests in Kathmandu.</p>

        {loadingReports && reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>Loading active requests...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, border: "1.5px dashed var(--line)", borderRadius: 18, color: "var(--ink-soft)", background: "var(--surface)" }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🎉</span>
            All clear! No pending rescues at the moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reports.map((report) => {
              const isAssignedToMe = report.assignedUserId === user.id;

              return (
                <div key={report.id} className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: isAssignedToMe ? "var(--sage)" : "var(--line)" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    {report.photoUrl ? (
                      <img src={report.photoUrl} alt="Reported animal" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover" }} />
                    ) : (
                      <div className="pp-thumb" style={{ width: 80, height: 80, background: "var(--bg)", borderRadius: 12, display: "grid", placeItems: "center", fontSize: 28 }}>🐾</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                        <span className="pp-fred" style={{ fontWeight: 800, fontSize: 14.5 }}>Report #{report.id}</span>
                        {report.status === "assigned" ? (
                          <span className="pp-pill" style={{ background: isAssignedToMe ? "var(--sage-soft)" : "var(--amber-soft)", color: isAssignedToMe ? "var(--sage)" : "var(--amber-deep)", padding: "2px 8px", fontSize: 11 }}>
                            {isAssignedToMe ? "Assigned to you" : `Assigned: ${report.assignedUserName}`}
                          </span>
                        ) : (
                          <span className="pp-pill" style={{ background: "var(--sos-soft)", color: "var(--sos)", padding: "2px 8px", fontSize: 11 }}>
                            Pending Help
                          </span>
                        )}
                      </div>
                      <div className="pp-sub" style={{ fontSize: 12, marginTop: 4 }}>
                        {new Date(report.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {report.tags.map(tag => (
                          <span key={tag} className="pp-pill" style={{ background: "var(--bg)", color: "var(--ink-soft)", fontSize: 10, padding: "2px 6px" }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {report.notes && (
                    <div className="pp-sub" style={{ fontSize: 12.5, fontStyle: "italic", background: "var(--bg)", padding: 8, borderRadius: 8 }}>
                      &ldquo;{report.notes}&rdquo;
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    📍 Coordinates: {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {report.status === "pending" && (
                      <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleAssignReport(report.id)}>
                        Accept Dispatch
                      </button>
                    )}
                    {isAssignedToMe && (
                      <>
                        <button className="pp-btn pp-btn-sos" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleResolveReport(report.id)}>
                          Mark as Resolved
                        </button>
                        <button className="pp-btn pp-btn-ghost" style={{ padding: "10px 14px", fontSize: 13, border: "1.5px solid var(--line)" }} onClick={() => handleUnassignReport(report.id)}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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

      <RescueMiniMap pin={pin} onPin={(nextPin) => { stopSharing(); setPin(nextPin); }} />

      {pin && (
        <div style={{ fontSize: 12, color: "var(--sage)", fontWeight: 700, marginTop: 6 }}>
          📍 Pin: {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
        </div>
      )}
      <button className="pp-btn pp-btn-ghost" disabled={locating} style={{ marginTop: 10, fontSize: 13.5, opacity: locating ? .65 : 1 }} onClick={() => sharingLocation ? stopSharing() : setLocationChoiceOpen(true)}>
        <Navigation size={16} /> {locating ? "Finding your location..." : sharingLocation ? "Stop sharing location" : "Use my current location"}
      </button>
      {sharingLocation && <p className="pp-location-sharing">Location is updating while this screen is open.</p>}
      <LocationChoiceDialog open={locationChoiceOpen} onClose={() => setLocationChoiceOpen(false)} onChoose={useLocation} />

      <button className="pp-btn pp-btn-sos" style={{ marginTop: 14, opacity: loading ? .65 : 1 }} disabled={loading} onClick={handleSubmit}>
        <Bell size={18} /> {loading ? "Sending report..." : "Alert nearest shelter"}
      </button>
    </div>
  );
}
