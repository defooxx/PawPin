import {
  AlertTriangle, ChevronRight, HeartHandshake, PawPrint, Search, Stethoscope,
} from "lucide-react";
import { fade, LOST_PETS } from "../data.js";



export function HomeScreen({ go, donate, user }) {
  if (user?.role === "shelter") {
    return (
      <div style={fade}>
        <p className="pp-sub" style={{ marginTop: 2 }}>Welcome back, shelter coordinator 🐾</p>
        <h1 className="pp-h1" style={{ marginTop: 2 }}>{user.name}</h1>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          <button className="pp-stat" onClick={() => go("rescue")} style={{ cursor: "pointer", border: "1px solid var(--line)", textAlign: "left", width: "100%", background: "none" }}>
            <div className="pp-statnum" style={{ color: "var(--sos)" }}>Active</div>
            <div className="pp-sub" style={{ fontSize: 12 }}>Rescue requests waiting</div>
          </button>
          <button className="pp-stat" onClick={() => go("adopt")} style={{ cursor: "pointer", border: "1px solid var(--line)", textAlign: "left", width: "100%", background: "none" }}>
            <div className="pp-statnum" style={{ color: "var(--sage)" }}>Adoptions</div>
            <div className="pp-sub" style={{ fontSize: 12 }}>Manage adoptable pets</div>
          </button>
        </div>

        <h2 className="pp-h2" style={{ marginTop: 24, marginBottom: 10 }}>Shelter Operations</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="pp-card" onClick={() => go("rescue")} style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <PawPrint size={24} color="var(--amber)" />
            <div style={{ flex: 1 }}>
              <div className="pp-fred" style={{ fontSize: 15, fontWeight: 600 }}>Rescue Dispatch Board</div>
              <div className="pp-sub" style={{ fontSize: 12.5 }}>Accept and respond to local rescue calls</div>
            </div>
            <ChevronRight size={18} color="var(--ink-soft)" />
          </button>

          <button className="pp-card" onClick={() => go("adopt")} style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <HeartHandshake size={24} color="var(--coral)" />
            <div style={{ flex: 1 }}>
              <div className="pp-fred" style={{ fontSize: 15, fontWeight: 600 }}>Adoption Visit Scheduler</div>
              <div className="pp-sub" style={{ fontSize: 12.5 }}>Confirm adoption visits and manage animals</div>
            </div>
            <ChevronRight size={18} color="var(--ink-soft)" />
          </button>
        </div>
      </div>
    );
  }

  if (user?.role === "vet") {
    return (
      <div style={fade}>
        <p className="pp-sub" style={{ marginTop: 2 }}>Welcome back, doctor 🩺</p>
        <h1 className="pp-h1" style={{ marginTop: 2 }}>{user.name}</h1>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 16 }}>
          <button className="pp-stat" onClick={() => go("health")} style={{ cursor: "pointer", border: "1px solid var(--line)", textAlign: "left", width: "100%", background: "none" }}>
            <div className="pp-statnum" style={{ color: "var(--sage)" }}>Queue</div>
            <div className="pp-sub" style={{ fontSize: 12 }}>Open veterinary symptom consultations</div>
          </button>
        </div>

        <h2 className="pp-h2" style={{ marginTop: 24, marginBottom: 10 }}>Medical Operations</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="pp-card" onClick={() => go("health")} style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <Stethoscope size={24} color="var(--sage)" />
            <div style={{ flex: 1 }}>
              <div className="pp-fred" style={{ fontSize: 15, fontWeight: 600 }}>Consultation Queue</div>
              <div className="pp-sub" style={{ fontSize: 12.5 }}>View patient symptom checker submissions</div>
            </div>
            <ChevronRight size={18} color="var(--ink-soft)" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={fade}>
      <p className="pp-sub" style={{ marginTop: 2 }}>Good afternoon 🐾</p>
      <h1 className="pp-h1" style={{ marginTop: 2 }}>Every animal nearby<br />has a friend in you.</h1>

      <button className="pp-sos" style={{ marginTop: 16 }} onClick={() => go("rescue")}>
        <div className="pp-pulse"><PawPrint size={150} color="#fff" /></div>
        <div className="pp-pill" style={{ background: "rgba(255,255,255,.22)", color: "#fff" }}>
          <AlertTriangle size={13} /> URGENT
        </div>
        <div className="pp-fred" style={{ fontSize: 21, fontWeight: 600, marginTop: 8 }}>Report an animal in need</div>
        <div style={{ fontSize: 13, opacity: .92, marginTop: 2 }}>Snap a photo, drop a pin — the nearest shelter gets it instantly.</div>
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <div className="pp-stat">
          <div className="pp-statnum" style={{ color: "var(--amber-deep)" }}>1,284</div>
          <div className="pp-sub" style={{ fontSize: 12 }}>Street animals mapped near you</div>
        </div>
        <div className="pp-stat">
          <div className="pp-statnum" style={{ color: "var(--sage)" }}>372</div>
          <div className="pp-sub" style={{ fontSize: 12 }}>Rescued &amp; rehomed this year</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }}>
        <h2 className="pp-h2">Lost near you</h2>
        <button className="pp-link" onClick={() => go("lost")}>See all</button>
      </div>
      {LOST_PETS.filter((pet) => pet.tag !== "home").map((pet) => (
        <div key={pet.name} className="pp-listcard" style={{ marginBottom: 10 }}>
          <div className="pp-thumb" style={{ background: "var(--bg)" }}>{pet.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5 }}>{pet.name}</span>
              <span className="pp-pill" style={{ background: "var(--bg)", color: pet.color, textTransform: "uppercase", fontSize: 9.5 }}>{pet.tag}</span>
            </div>
            <div className="pp-sub" style={{ fontSize: 12.5 }}>{pet.meta}</div>
          </div>
          <button className="pp-icobtn" aria-label={`View ${pet.name}`} onClick={() => go("lost")} style={{ width: 36, height: 36 }}>
            <Search size={16} color="var(--sky)" />
          </button>
        </div>
      ))}

      <h2 className="pp-h2" style={{ marginTop: 22, marginBottom: 10 }}>Happening near you</h2>
      {[
        { icon: <Stethoscope size={18} />, color: "var(--sage)", title: "Injured pup picked up", detail: "Sunny Tails responded in 11 min" },
        { icon: <PawPrint size={18} />, color: "var(--coral)", title: "Daisy is looking for a home", detail: "4-month puppy · Sunny Tails" },
      ].map((activity) => (
        <div key={activity.title} className="pp-listcard" style={{ marginBottom: 10 }}>
          <div className="pp-thumb" style={{ background: "var(--bg)", color: activity.color }}>{activity.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{activity.title}</div>
            <div className="pp-sub" style={{ fontSize: 12.5 }}>{activity.detail}</div>
          </div>
          <ChevronRight size={18} color="var(--ink-soft)" />
        </div>
      ))}

      <button className="pp-card" onClick={donate}
        style={{ marginTop: 8, width: "100%", textAlign: "left", cursor: "pointer", background: "var(--sage-soft)", borderColor: "var(--sage-soft)", display: "flex", alignItems: "center", gap: 12 }}>
        <HeartHandshake size={26} color="var(--sage)" />
        <div style={{ flex: 1 }}>
          <div className="pp-fred" style={{ fontSize: 15.5, fontWeight: 600 }}>Fuel a rescue</div>
          <div className="pp-sub" style={{ fontSize: 12.5 }}>Donate any amount to a local shelter</div>
        </div>
        <ChevronRight size={18} color="var(--sage)" />
      </button>
    </div>
  );
}
