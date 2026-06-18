import { useEffect, useState } from "react";
import { Cat, Dog, Phone, Stethoscope, Check, Calendar, MessageSquare, Clock, User } from "lucide-react";
import { fade, SYMPTOMS, URGENT_SYMPTOMS } from "../data.js";
import { getConsultations, createConsultation, updateConsultation } from "../services/api.js";

export function HealthScreen({ user, toast }) {
  const [species, setSpecies] = useState("dog");
  const [selected, setSelected] = useState([]);
  const [checked, setChecked] = useState(false);
  const [consultationSubmitted, setConsultationSubmitted] = useState(false);

  // Consultations state
  const [consultations, setConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  const loadConsultations = async () => {
    if (!user) return;
    setLoadingConsultations(true);
    try {
      const list = await getConsultations();
      setConsultations(list);
    } catch (err) {
      console.error("Failed to load consultations:", err);
    } finally {
      setLoadingConsultations(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, [user]);

  const toggle = (symptom) => {
    setChecked(false);
    setConsultationSubmitted(false);
    setSelected((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]);
  };

  const handleRequestConsultation = async () => {
    if (!user) {
      toast("Please log in to request a vet consultation.");
      return;
    }
    try {
      await createConsultation({
        petSpecies: species,
        symptoms: selected,
      });
      toast("Consultation request submitted! A vet will contact you soon.");
      setConsultationSubmitted(true);
      loadConsultations();
    } catch (err) {
      toast(err.message || "Failed to request consultation");
    }
  };

  const handleUpdateConsultationStatus = async (id, nextStatus) => {
    try {
      await updateConsultation(id, nextStatus);
      toast(`Consultation marked as ${nextStatus}!`);
      loadConsultations();
    } catch (err) {
      toast(err.message || "Failed to update consultation");
    }
  };

  const urgent = selected.some((symptom) => URGENT_SYMPTOMS.has(symptom));
  const level = selected.length === 0 ? null : urgent ? {
    color: "linear-gradient(135deg,#FF6B4A,var(--sos))",
    title: "See a vet now",
    detail: "One or more signs you picked can be serious. Contact a vet or emergency clinic right away — don't wait it out.",
    actionable: true,
  } : selected.length >= 3 ? {
    color: "linear-gradient(135deg,#F7A833,var(--amber-deep))",
    title: "Book a vet soon",
    detail: "Several mild signs together are worth a check-up within a day or two. Note when they started and any changes.",
    actionable: true,
  } : {
    color: "linear-gradient(135deg,#48B08F,var(--sage))",
    title: "Monitor at home",
    detail: "Likely mild. Keep your pet rested, hydrated and watched. If it worsens or lasts beyond 48 hours, call a vet.",
    actionable: false,
  };

  // Vet Portal view
  if (user?.role === "vet") {
    return (
      <div style={fade}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 className="pp-h1" style={{ margin: 0 }}>Consultation Queue</h1>
          <button className="pp-btn pp-btn-ghost" style={{ width: "auto", padding: "8px 12px", borderRadius: 12, fontSize: 13, border: "1px solid var(--line)" }} onClick={loadConsultations} disabled={loadingConsultations}>
            {loadingConsultations ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <p className="pp-sub" style={{ marginTop: 2, marginBottom: 16 }}>Review patient symptom check inquiries.</p>

        {loadingConsultations && consultations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--ink-soft)" }}>Loading consultations...</div>
        ) : consultations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, border: "1.5px dashed var(--line)", borderRadius: 18, color: "var(--ink-soft)", background: "var(--surface)" }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🩺</span>
            All clear! No open consultations.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {consultations.map((req) => (
              <div key={req.id} className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: req.status === "pending" ? "var(--amber)" : "var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="pp-fred" style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                    {req.petSpecies === "cat" ? "🐱 Cat" : "🐶 Dog"} Consultation
                  </span>
                  <span className={"pp-pill " + req.status} style={{
                    background: req.status === "contacted" ? "var(--sage-soft)" : req.status === "resolved" ? "var(--sky-soft)" : "var(--amber-soft)",
                    color: req.status === "contacted" ? "var(--sage)" : req.status === "resolved" ? "var(--sky)" : "var(--amber-deep)",
                  }}>
                    {req.status}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "2px 0" }}>
                  {req.symptoms.map((symptom) => (
                    <span key={symptom} className="pp-pill" style={{ background: "var(--sos-soft)", color: "var(--sos)", fontSize: 11, fontWeight: 600 }}>{symptom}</span>
                  ))}
                </div>

                <div className="pp-sub" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4, background: "var(--bg)", padding: 10, borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User size={14} color="var(--ink-soft)" /> <b>Owner:</b> {req.userName}
                  </div>
                  <div>📞 <b>Contact:</b> {req.userContact}</div>
                  <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Clock size={12} /> Filed on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {req.status === "pending" && (
                  <button className="pp-btn pp-btn-amber" style={{ padding: "10px 14px", fontSize: 13, marginTop: 4 }} onClick={() => handleUpdateConsultationStatus(req.id, "contacted")}>
                    Mark as Contacted
                  </button>
                )}

                {req.status === "contacted" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button className="pp-btn pp-btn-sos" style={{ padding: "10px 14px", fontSize: 13, flex: 1, background: "var(--sage)", boxShadow: "none" }} onClick={() => handleUpdateConsultationStatus(req.id, "resolved")}>
                      Resolve Inquiry
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Individual Portal View (Standard User)
  return (
    <div style={fade}>
      <h1 className="pp-h1">Symptom helper</h1>
      <p className="pp-sub" style={{ marginTop: 4, marginBottom: 14 }}>Pick what you're noticing. This is guidance to help you decide — not a diagnosis.</p>

      <div className="pp-segment" style={{ marginBottom: 16 }}>
        <button className={"pp-seg" + (species === "dog" ? " on" : "")} onClick={() => setSpecies("dog")}><Dog size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />Dog</button>
        <button className={"pp-seg" + (species === "cat" ? " on" : "")} onClick={() => setSpecies("cat")}><Cat size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />Cat</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SYMPTOMS.map((symptom) => (
          <button key={symptom} className={"pp-chip sage" + (selected.includes(symptom) ? " on" : "")} onClick={() => toggle(symptom)}>{symptom}</button>
        ))}
      </div>

      <button className="pp-btn pp-btn-amber" style={{ marginTop: 16, opacity: selected.length ? 1 : .5 }} disabled={!selected.length} onClick={() => setChecked(true)}>
        <Stethoscope size={18} /> Check {selected.length ? `(${selected.length})` : ""}
      </button>

      {checked && level && (
        <div style={{ marginTop: 16, ...fade }}>
          <div className="pp-result" style={{ background: level.color }}>
            <div className="pp-fred" style={{ fontSize: 19, fontWeight: 600 }}>{level.title}</div>
            <div style={{ fontSize: 13.5, opacity: .95, marginTop: 6 }}>{level.detail}</div>
          </div>

          {/* Actionable button to request vet consultation */}
          {level.actionable && !consultationSubmitted && (
            <button className="pp-btn pp-btn-amber" style={{ marginTop: 12, background: "var(--sage)", boxShadow: "none" }} onClick={handleRequestConsultation}>
              <MessageSquare size={17} /> Request Free Vet Consultation
            </button>
          )}

          {consultationSubmitted && (
            <div className="pp-result" style={{ background: "linear-gradient(135deg,#48B08F,var(--sage))", marginTop: 12 }}>
              <Check size={20} />
              <div className="pp-fred" style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Consultation Request Filed</div>
              <div style={{ fontSize: 12, opacity: 0.95 }}>A licensed vet in Kathmandu has been added to your case and will contact you via email/phone shortly.</div>
            </div>
          )}

          {urgent && <button className="pp-btn pp-btn-sos" style={{ marginTop: 12 }}><Phone size={17} /> Call nearest 24-hr vet</button>}
          
          <p className="pp-sub" style={{ fontSize: 11.5, marginTop: 12, textAlign: "center" }}>
            PawPin can't diagnose illness. Always rely on a licensed veterinarian for medical decisions.
          </p>
        </div>
      )}

      {/* Individual's requested consultations list */}
      {user && consultations.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 className="pp-h2" style={{ marginBottom: 10 }}>Your Consultation Inquiries</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {consultations.map((c) => (
              <div key={c.id} className="pp-listcard">
                <div className="pp-thumb" style={{ background: "var(--sage-soft)", color: "var(--sage)", fontSize: 24 }}><Stethoscope size={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>{c.petSpecies === "cat" ? "🐱 Cat" : "🐶 Dog"} Check-up</div>
                  <div className="pp-sub" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                    {c.symptoms.join(", ")}
                  </div>
                </div>
                <span className="pp-pill" style={{
                  background: c.status === "contacted" ? "var(--sage-soft)" : c.status === "resolved" ? "var(--sky-soft)" : "var(--amber-soft)",
                  color: c.status === "contacted" ? "var(--sage)" : c.status === "resolved" ? "var(--sky)" : "var(--amber-deep)",
                  fontSize: 10.5
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
