import { useState } from "react";
import { Cat, Dog, Phone, Stethoscope } from "lucide-react";
import { fade, SYMPTOMS, URGENT_SYMPTOMS } from "../data.js";

export function HealthScreen() {
  const [species, setSpecies] = useState("dog");
  const [selected, setSelected] = useState([]);
  const [checked, setChecked] = useState(false);

  const toggle = (symptom) => {
    setChecked(false);
    setSelected((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom]);
  };

  const urgent = selected.some((symptom) => URGENT_SYMPTOMS.has(symptom));
  const level = selected.length === 0 ? null : urgent ? {
    color: "linear-gradient(135deg,#FF6B4A,var(--sos))",
    title: "See a vet now",
    detail: "One or more signs you picked can be serious. Contact a vet or emergency clinic right away — don't wait it out.",
  } : selected.length >= 3 ? {
    color: "linear-gradient(135deg,#F7A833,var(--amber-deep))",
    title: "Book a vet soon",
    detail: "Several mild signs together are worth a check-up within a day or two. Note when they started and any changes.",
  } : {
    color: "linear-gradient(135deg,#48B08F,var(--sage))",
    title: "Monitor at home",
    detail: "Likely mild. Keep your pet rested, hydrated and watched. If it worsens or lasts beyond 48 hours, call a vet.",
  };

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
          {urgent && <button className="pp-btn pp-btn-sos" style={{ marginTop: 12 }}><Phone size={17} /> Call nearest 24-hr vet</button>}
          <p className="pp-sub" style={{ fontSize: 11.5, marginTop: 12, textAlign: "center" }}>
            PawPin can't diagnose illness. Always rely on a licensed veterinarian for medical decisions.
          </p>
        </div>
      )}
    </div>
  );
}
