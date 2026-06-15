import { useState } from "react";
import { Plus } from "lucide-react";
import { fade, LOST_PETS } from "../data.js";

const FILTERS = [["all", "All"], ["lost", "Lost"], ["found", "Found"], ["home", "Reunited"]];

export function LostScreen({ toast }) {
  const [filter, setFilter] = useState("all");
  const items = filter === "all" ? LOST_PETS : LOST_PETS.filter((pet) => pet.tag === filter);

  return (
    <div style={fade}>
      <h1 className="pp-h1">Lost &amp; Found</h1>
      <p className="pp-sub" style={{ marginTop: 4, marginBottom: 14 }}>Neighbours within 5 km get notified the moment you post.</p>
      <div className="pp-segment" style={{ marginBottom: 14 }}>
        {FILTERS.map(([value, label]) => (
          <button key={value} className={"pp-seg" + (filter === value ? " on" : "")} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      {items.map((pet) => (
        <div key={pet.name} className="pp-listcard" style={{ marginBottom: 10 }}>
          <div className="pp-thumb" style={{ background: "var(--bg)" }}>{pet.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{pet.name}</span>
              <span className="pp-pill" style={{ background: "var(--bg)", color: pet.color, textTransform: "uppercase", fontSize: 10 }}>{pet.tag === "home" ? "reunited" : pet.tag}</span>
            </div>
            <div className="pp-sub" style={{ fontSize: 12.5 }}>{pet.meta}</div>
          </div>
        </div>
      ))}
      <button className="pp-btn pp-btn-amber" style={{ marginTop: 6 }} onClick={() => toast("Post started — add photos & last-seen pin")}>
        <Plus size={18} /> Report a lost or found pet
      </button>
    </div>
  );
}
