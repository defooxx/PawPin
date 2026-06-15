import { useState } from "react";
import { Building2, Check, ChevronRight, Heart, HeartHandshake, ShieldCheck, X } from "lucide-react";
import { ADOPTABLE_ANIMALS, fade } from "../data.js";

const MEETING_SLOTS = ["Sat 10:00 AM", "Sat 2:00 PM", "Sun 11:00 AM", "Sun 4:00 PM"];

export function AdoptScreen() {
  const [favorites, setFavorites] = useState({});
  const [openIndex, setOpenIndex] = useState(null);
  const [meeting, setMeeting] = useState(false);
  const [slot, setSlot] = useState(null);
  const [done, setDone] = useState(false);

  const toggleFavorite = (index) => setFavorites((current) => ({ ...current, [index]: !current[index] }));
  const closeDetail = () => {
    setOpenIndex(null);
    setMeeting(false);
    setSlot(null);
    setDone(false);
  };

  if (openIndex !== null) {
    const animal = ADOPTABLE_ANIMALS[openIndex];

    if (done) {
      return (
        <div style={fade}>
          <button className="pp-icobtn" aria-label="Back to adoptions" onClick={closeDetail} style={{ marginBottom: 14 }}><X size={18} /></button>
          <div className="pp-result" style={{ background: "linear-gradient(135deg,#FF9270,var(--coral))" }}>
            <Check size={30} />
            <div className="pp-fred" style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Meeting requested 🐾</div>
            <div style={{ fontSize: 13.5, opacity: .95, marginTop: 4 }}>
              {animal.shelter} will confirm your visit with {animal.name} for <b>{slot}</b>. You'll get a reminder and the shelter address here.
            </div>
          </div>
          <button className="pp-btn pp-btn-ghost" style={{ marginTop: 14 }} onClick={closeDetail}>Back to adoptions</button>
        </div>
      );
    }

    return (
      <div style={fade}>
        <button className="pp-icobtn" aria-label="Back to adoptions" onClick={closeDetail} style={{ marginBottom: 12 }}>
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
        </button>

        <div style={{ borderRadius: 22, height: 168, display: "grid", placeItems: "center", fontSize: 84, background: animal.bg, position: "relative" }}>
          {animal.emoji}
          <button className="pp-fav" aria-label={`Favorite ${animal.name}`} onClick={() => toggleFavorite(openIndex)} style={{ top: 12, right: 12 }}>
            <Heart size={18} fill={favorites[openIndex] ? "var(--coral)" : "none"} />
          </button>
        </div>

        <h1 className="pp-h1" style={{ marginTop: 14 }}>{animal.name}</h1>
        <div className="pp-sub" style={{ fontSize: 13 }}>{animal.age} · {animal.sex} · {animal.size}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }}>
          {animal.tags.map((tag) => <span key={tag} className="pp-pill" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>{tag}</span>)}
        </div>

        <h2 className="pp-h2" style={{ marginTop: 16, marginBottom: 6 }}>About {animal.name}</h2>
        <p className="pp-sub" style={{ fontSize: 13.5 }}>{animal.about}</p>

        <h2 className="pp-h2" style={{ marginTop: 16, marginBottom: 8 }}>Health &amp; care</h2>
        {animal.health.map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--sage-soft)", display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={13} color="var(--sage)" /></span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item}</span>
          </div>
        ))}

        <div className="pp-listcard" style={{ marginTop: 14 }}>
          <div className="pp-thumb" style={{ background: "var(--bg)", color: "var(--sage)" }}><Building2 size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{animal.shelter}</div>
            <div className="pp-sub" style={{ fontSize: 12 }}>Foster &amp; adoption · response within a day</div>
          </div>
        </div>

        {!meeting ? (
          <button className="pp-btn pp-btn-amber" style={{ marginTop: 16 }} onClick={() => setMeeting(true)}>
            <HeartHandshake size={18} /> I'm interested — arrange a meeting
          </button>
        ) : (
          <div style={{ marginTop: 16, ...fade }}>
            <div className="pp-fred" style={{ fontWeight: 600, marginBottom: 8 }}>Pick a time to meet {animal.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MEETING_SLOTS.map((meetingSlot) => (
                <button key={meetingSlot} className={"pp-chip" + (slot === meetingSlot ? " on" : "")} onClick={() => setSlot(meetingSlot)}>{meetingSlot}</button>
              ))}
            </div>
            <button className="pp-btn pp-btn-amber" style={{ marginTop: 14, opacity: slot ? 1 : .5 }} disabled={!slot} onClick={() => setDone(true)}>
              Request meeting
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={fade}>
      <h1 className="pp-h1">Find a forever friend</h1>
      <div className="pp-card" style={{ marginTop: 12, marginBottom: 14, display: "flex", gap: 11, alignItems: "center", background: "var(--coral-soft)", borderColor: "var(--coral-soft)" }}>
        <ShieldCheck size={24} color="var(--coral)" style={{ flexShrink: 0 }} />
        <div className="pp-sub" style={{ fontSize: 12.5, color: "var(--ink)" }}>
          <b>Adopt, never buy.</b> Selling animals is not allowed on PawPin. Every listing comes from a shelter or foster.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["Dogs", "Cats", "Puppies", "Good w/ kids"].map((filter, index) => (
          <button key={filter} className={"pp-chip" + (index === 0 ? " on" : "")}>{filter}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {ADOPTABLE_ANIMALS.map((animal, index) => (
          <div key={animal.name} className="pp-adopt">
            <div className="pp-adopt-img" style={{ background: animal.bg }}>
              {animal.emoji}
              <button className="pp-fav" aria-label={`Favorite ${animal.name}`} onClick={() => toggleFavorite(index)}>
                <Heart size={17} fill={favorites[index] ? "var(--coral)" : "none"} />
              </button>
            </div>
            <div style={{ padding: "10px 12px 13px" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{animal.name}</div>
              <div className="pp-sub" style={{ fontSize: 11.5 }}>{animal.age}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "7px 0" }}>
                {animal.tags.map((tag) => <span key={tag} className="pp-pill" style={{ background: "var(--bg)", color: "var(--ink-soft)", fontSize: 10 }}>{tag}</span>)}
              </div>
              <button className="pp-btn pp-btn-ghost" style={{ padding: 9, fontSize: 12.5 }} onClick={() => setOpenIndex(index)}>Meet {animal.name}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
