import { Check, Heart, HeartHandshake, Home as HomeIcon, Map as MapIcon, PawPrint, Search, Stethoscope, UserRound } from "lucide-react";
import { APP_STYLES } from "../styles.js";

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "rescue", label: "Rescue", icon: PawPrint },
  { id: "lost", label: "Lost", icon: Search },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "adopt", label: "Adopt", icon: Heart },
  { id: "health", label: "Health", icon: Stethoscope },
];

export function AppShell({ activeTab, children, onAccount, onDonate, onTabChange, toast, user }) {
  return (
    <div className="pp-root">
      <style>{APP_STYLES}</style>
      <div className="pp-stage">
        <div className="pp-phone">
          <header className="pp-header">
            <div className="pp-brand">
              <div className="pp-logo"><PawPrint size={21} color="#fff" /></div>
              <div>
                <div className="pp-fred" style={{ fontWeight: 600, fontSize: 18, lineHeight: 1 }}>PawPin</div>
                <div className="pp-sub" style={{ fontSize: 10.5 }}>Help that finds them</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button className="pp-icobtn" aria-label="Donate to a shelter" onClick={onDonate}><HeartHandshake size={19} color="var(--coral)" /></button>
              <button className="pp-icobtn" aria-label="Account" onClick={onAccount}>
                {user?.photoUrl ? <img src={user.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <UserRound size={19} color="var(--sage)" />}
              </button>
            </div>
          </header>

          <main className="pp-scroll">{children}</main>

          {toast && <div className="pp-toast" role="status"><Check size={17} color="var(--amber)" />{toast}</div>}

          {activeTab !== "account" && <nav className="pp-tabs" aria-label="Primary navigation">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={"pp-tab" + (activeTab === id ? " active" : "")}
                aria-current={activeTab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
              >
                <span className="pp-pawwrap"><Icon size={20} /></span>{label}
              </button>
            ))}
          </nav>}
        </div>
      </div>
    </div>
  );
}
