import { useEffect, useRef, useState } from "react";
import { Bell, Building2, Camera, Check, Navigation, Plus } from "lucide-react";
import L from "leaflet";
import { fade, RESCUE_ISSUES } from "../data.js";
import { LocationChoiceDialog } from "../components/LocationChoiceDialog.jsx";
import { createReport, uploadReportPhoto, getMapPins, assignPin, unassignPin, resolvePin, updateRescueStatus } from "../services/api.js";
import { getCurrentLocation, stopWatchingLocation, watchCurrentLocation } from "../services/location.js";

const KATHMANDU = [27.7172, 85.324];
const RESPONDER_ROLES = new Set(["shelter", "vet", "admin"]);
const STATUS_LABELS = {
  pending: "Pending Help",
  review: "Under Review",
  under_review: "Under Review",
  assigned: "Assigned",
  on_the_way: "On the way",
  rescued: "Rescued",
  at_vet_or_shelter: "At vet/shelter",
  closed: "Closed",
  false: "Marked false",
  abusive: "Flagged abusive",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

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
  const [savedReport, setSavedReport] = useState(null);
  const [contact, setContact] = useState({
    name: user?.name || "",
    phone: user?.phoneNumber || "",
    alt: "",
    notes: "",
    consent: false,
  });
  const [locationChoiceOpen, setLocationChoiceOpen] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef(null);
  const watchRef = useRef(null);

  // Shelter state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    setContact((current) => ({
      ...current,
      name: current.name || user?.name || "",
      phone: current.phone || user?.phoneNumber || "",
    }));
  }, [user]);

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
      toast("Rescue case closed.");
      fetchReports();
    } catch (err) {
      toast(err.message || "Failed to resolve rescue request");
    }
  };

  const handleStatusUpdate = async (reportId, status, note) => {
    try {
      const result = await updateRescueStatus(reportId, status, note);
      toast(`Status updated to ${statusLabel(result.status)}`);
      fetchReports();
    } catch (err) {
      toast(err.message || "Failed to update rescue status");
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
    if (!contact.name.trim()) { toast("Add your name so responders know who to contact"); return; }
    if (!/^[+\d\s().-]{7,30}$/.test(contact.phone.trim())) { toast("Add a valid phone number"); return; }
    if (!contact.consent) { toast("Allow PawPin to share your contact with verified responders"); return; }

    setLoading(true);
    try {
      const photoUrl = await uploadReportPhoto(photo);
      const report = await createReport({
        photoUrl,
        location: { latitude: pin[0], longitude: pin[1] },
        tags: issues,
        notes: contact.notes || "Report created from PawPin web app",
        reporterName: contact.name,
        reporterPhone: contact.phone,
        reporterAltContact: contact.alt,
        contactConsent: contact.consent,
      });
      setSavedReport(report);
      toast("Report submitted. Verified responders can now review it.");
      setSent(true);
    } catch (err) {
      console.error(err);
      toast(err.message || "Network error sending report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopSharing();
    setSent(false);
    setSavedReport(null);
    setPhoto(null);
    setIssues([]);
    setPin(null);
    setContact((current) => ({ ...current, alt: "", notes: "", consent: false }));
  };

  if (RESPONDER_ROLES.has(user?.role)) {
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
                        {report.status === "assigned" || report.status === "on_the_way" || report.status === "rescued" || report.status === "at_vet_or_shelter" ? (
                          <span className="pp-pill" style={{ background: isAssignedToMe ? "var(--sage-soft)" : "var(--amber-soft)", color: isAssignedToMe ? "var(--sage)" : "var(--amber-deep)", padding: "2px 8px", fontSize: 11 }}>
                            {isAssignedToMe ? statusLabel(report.status) : `Assigned: ${report.assignedUserName}`}
                          </span>
                        ) : (
                          <span className="pp-pill" style={{ background: "var(--sos-soft)", color: "var(--sos)", padding: "2px 8px", fontSize: 11 }}>
                            {statusLabel(report.status)}
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

                  {(report.reporterName || report.reporterPhone || report.reporterAltContact) && (
                    <div className="pp-card" style={{ padding: 10, background: "var(--bg)", boxShadow: "none" }}>
                      <div className="pp-fred" style={{ fontSize: 12, fontWeight: 800 }}>Reporter contact</div>
                      {report.reporterName && <div className="pp-sub" style={{ fontSize: 12 }}>Name: {report.reporterName}</div>}
                      {report.reporterPhone && <div className="pp-sub" style={{ fontSize: 12 }}>Phone: {report.reporterPhone}</div>}
                      {report.reporterAltContact && <div className="pp-sub" style={{ fontSize: 12 }}>Other: {report.reporterAltContact}</div>}
                    </div>
                  )}

                  {report.lastStatusNote && (
                    <div className="pp-sub" style={{ fontSize: 12 }}>
                      Latest update: {report.lastStatusNote}
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
                        {report.status === "assigned" && (
                          <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleStatusUpdate(report.id, "on_the_way", "Responder is on the way.")}>
                            On The Way
                          </button>
                        )}
                        {report.status === "on_the_way" && (
                          <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleStatusUpdate(report.id, "rescued", "Animal has been rescued.")}>
                            Mark Rescued
                          </button>
                        )}
                        {report.status === "rescued" && (
                          <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleStatusUpdate(report.id, "at_vet_or_shelter", "Animal is now with a vet or shelter.")}>
                            At Vet/Shelter
                          </button>
                        )}
                        <button className="pp-btn pp-btn-sos" style={{ padding: "10px 14px", fontSize: 13, flex: 1 }} onClick={() => handleResolveReport(report.id)}>
                          Close Case
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
          <div className="pp-fred" style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Report #{savedReport?.id || ""} submitted</div>
          <div style={{ fontSize: 13.5, opacity: .95, marginTop: 4 }}>
            Current status: {statusLabel(savedReport?.status || "pending")}. Verified shelters, vets, and admins can review and update this case.
          </div>
        </div>
        <h2 className="pp-h2" style={{ margin: "20px 0 10px" }}>Status timeline</h2>
        {(savedReport?.events || []).map((event) => (
          <div key={event.id} className="pp-listcard" style={{ marginBottom: 10 }}>
            <div className="pp-thumb" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}><Building2 size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{statusLabel(event.status)}</div>
              <div className="pp-sub" style={{ fontSize: 12 }}>{event.note || "Status updated"}</div>
              <div className="pp-sub" style={{ fontSize: 11 }}>{new Date(event.createdAt).toLocaleString()}</div>
            </div>
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

      <div className="pp-fred" style={{ fontWeight: 600, margin: "18px 0 8px" }}>4 · Contact details</div>
      <label className="pp-field"><span>Your name</span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Name responders can use" /></label>
      <label className="pp-field"><span>Phone number</span><input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} placeholder="+977 98..." inputMode="tel" /></label>
      <label className="pp-field"><span>WhatsApp, Viber, or alternate contact</span><input value={contact.alt} onChange={(event) => setContact({ ...contact, alt: event.target.value })} placeholder="Optional" /></label>
      <label className="pp-field"><span>Extra notes for responders</span><textarea value={contact.notes} onChange={(event) => setContact({ ...contact, notes: event.target.value })} placeholder="Landmark, animal behavior, visible injury..." rows={3} /></label>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }}>
        <input type="checkbox" checked={contact.consent} onChange={(event) => setContact({ ...contact, consent: event.target.checked })} style={{ marginTop: 2 }} />
        Share my contact details with verified shelters, vets, admins, or assigned responders for this rescue.
      </label>

      <button className="pp-btn pp-btn-sos" style={{ marginTop: 14, opacity: loading ? .65 : 1 }} disabled={loading} onClick={handleSubmit}>
        <Bell size={18} /> {loading ? "Sending report..." : "Alert nearest shelter"}
      </button>
    </div>
  );
}
