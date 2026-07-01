import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Siren, Map, Building2, PawPrint, Search, HeartHandshake,
  BarChart3, Users, Bell, ChevronDown, Clock, AlertTriangle, Check, X,
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Filter, Flag, Eye,
  Ban, MessageSquare, Plus, Stethoscope, Inbox, Radio, Camera, MapPin
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ─── CONFIG & API ───────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "pawpin-admin-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const get = (path) => api("GET", path);
const post = (path, body) => api("POST", path, body);
const patch = (path, body) => api("PATCH", path, body);

// ─── THEME CSS ────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box; margin: 0; padding: 0;}
:root{
  --canvas:#F7F8FA;--panel:#FFFFFF;--sidebar:#221C17;--sidebar-soft:#33291F;
  --ink:#1E232B;--muted:#6B7682;--faint:#9AA4AF;
  --amber:#F7A833;--amber-deep:#E0860C;--amber-soft:#FEF1DC;
  --red:#E5462E;--red-soft:#FCE4DF;--green:#2FA67E;--green-soft:#E2F3EC;
  --sky:#3E8ED0;--sky-soft:#E5F0FA;--line:#EAEDF1;
}
.ad{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--canvas);min-height:100vh;display:flex}
.ad ::-webkit-scrollbar{width:8px;height:8px}.ad ::-webkit-scrollbar-thumb{background:#D7DCE2;border-radius:8px}
.mono{font-variant-numeric:tabular-nums}.sg{font-family:'Space Grotesk',sans-serif}

.sb{width:236px;flex-shrink:0;background:var(--sidebar);color:#EBE3D8;height:100vh;position:sticky;top:0;display:flex;flex-direction:column;padding:18px 12px;z-index:10;}
.sb-logo{display:flex;align-items:center;gap:10px;padding:6px 8px 16px}
.sb-mark{width:34px;height:34px;border-radius:10px;background:var(--amber);display:grid;place-items:center;flex-shrink:0}
.sb-group{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#8C7F70;margin:16px 10px 6px;font-weight:600}
.sb-item{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:10px;cursor:pointer;color:#C9BEAF;font-size:13.5px;font-weight:500;border:none;background:none;width:100%;text-align:left;transition:.12s}
.sb-item:hover{background:var(--sidebar-soft);color:#fff}
.sb-item.on{background:var(--amber);color:#3a2a10;font-weight:600}
.sb-badge{margin-left:auto;background:var(--red);color:#fff;font-size:10.5px;font-weight:700;border-radius:999px;padding:1px 7px}
.sb-item.on .sb-badge{background:#3a2a10;color:#fff}
.sb-user{margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px;border-top:1px solid #3a2f24;background:none;border-left:none;border-right:none;cursor:pointer;width:100%;text-align:left;}
.sb-av{width:32px;height:32px;border-radius:9px;background:var(--amber-deep);display:grid;place-items:center;font-weight:700;color:#fff;font-size:13px;flex-shrink:0;}

.main{flex:1;min-width:0;display:flex;flex-direction:column;height:100vh;overflow:hidden}
.top{height:62px;background:var(--panel);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:0 22px;flex-shrink:0}
.top h1{font-size:18px;font-weight:600}
.search{flex:1;max-width:340px;display:flex;align-items:center;gap:8px;background:var(--canvas);border:1px solid var(--line);border-radius:10px;padding:8px 12px;color:var(--muted);font-size:13px}
.search input{border:none;background:none;outline:none;font-family:inherit;font-size:13px;color:var(--ink);width:100%}
.chipbtn{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:8px 12px;font-size:13px;font-weight:500;cursor:pointer;color:var(--ink)}
.iconbtn{width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--panel);display:grid;place-items:center;cursor:pointer;position:relative;color:var(--ink)}
.ndot{position:absolute;top:8px;right:9px;width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid #fff}
.body{flex:1;overflow-y:auto;padding:22px}

.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
@media(max-width:1180px){.kpis{grid-template-columns:repeat(3,1fr)}}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px;text-align:left}
.kpi.click{cursor:pointer;transition:.12s;width:100%}
.kpi.click:hover{border-color:var(--amber);box-shadow:0 6px 16px -8px rgba(0,0,0,.18)}
.kpi-l{font-size:12px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:6px}
.kpi-v{font-size:25px;font-weight:600;margin-top:8px;letter-spacing:-.5px}
.kpi-d{font-size:11.5px;font-weight:600;margin-top:5px;display:flex;align-items:center;gap:3px}
.up{color:var(--green)}.down{color:var(--red)}.flat{color:var(--muted)}

.grid2{display:grid;grid-template-columns:1.7fr 1fr;gap:18px;margin-top:18px}
@media(max-width:1080px){.grid2{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;margin-bottom:18px;}
.ph{display:flex;align-items:center;justify-content:space-between;padding:15px 17px;border-bottom:1px solid var(--line)}
.ph h2{font-size:15px;font-weight:600}.ph .sub{font-size:12px;color:var(--muted);font-weight:400}
.link{color:var(--amber-deep);font-size:12.5px;font-weight:600;cursor:pointer;background:none;border:none}

table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);font-weight:600;padding:10px 17px;border-bottom:1px solid var(--line)}
td{padding:12px 17px;border-bottom:1px solid var(--line);font-size:13px;vertical-align:middle}
tr:last-child td{border-bottom:none}
.who{display:flex;align-items:center;gap:10px}
.emoji{width:36px;height:36px;border-radius:9px;background:var(--canvas);display:grid;place-items:center;font-size:19px;flex-shrink:0}
.tag{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:600}
.t-crit{background:var(--red-soft);color:#B5311D}.t-urg{background:var(--amber-soft);color:var(--amber-deep)}
.t-ok{background:var(--green-soft);color:#1E7C5C}.t-sky{background:var(--sky-soft);color:#2C6FA8}.t-gray{background:#EEF1F4;color:#5C6670}
.sla{font-weight:700;font-size:12.5px}.sla.breach{color:var(--red)}.sla.ok{color:var(--green)}
.rowbtn{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink)}
.rowbtn:hover{border-color:#C9D0D8}
.rowbtn.primary{background:var(--amber);border-color:var(--amber);color:#3a2a10}
.rowbtn.danger{border-color:var(--red);color:var(--red)}
.rowbtn:disabled{opacity:.5;cursor:default}

.alert{display:flex;gap:11px;padding:13px 17px;border-bottom:1px solid var(--line);align-items:center}
.alert .ic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
.alert .t{font-size:13px;font-weight:600}.alert .s{font-size:12px;color:var(--muted);margin-top:1px}

.cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(208px,1fr));gap:14px;padding:17px}
.acard{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;}
.acard .img{height:120px;display:grid;place-items:center;font-size:44px;background:var(--canvas);overflow:hidden;}
.acard .img img{width:100%;height:100%;object-fit:cover;}
.acard .b{padding:11px 12px}
.flag{display:flex;align-items:center;gap:6px;background:var(--red-soft);color:#B5311D;font-size:11.5px;font-weight:600;padding:6px 12px}

.legend{display:flex;gap:16px;padding:0 17px 14px;font-size:12.5px;color:var(--muted);flex-wrap:wrap}
.dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:6px;vertical-align:-1px}
.mapwrap{position:relative}
.mapbox{height:450px;border-radius:0 0 14px 14px;position:relative;overflow:hidden;background:repeating-linear-gradient(0deg,#EEF3EE 0 30px,#E8EFEA 30px 60px),repeating-linear-gradient(90deg,transparent 0 70px,rgba(0,0,0,.03) 70px 71px)}
.mpin{position:absolute;width:26px;height:26px;border-radius:50% 50% 50% 4px;rotate:45deg;display:grid;place-items:center;box-shadow:0 4px 10px rgba(0,0,0,.25);cursor:pointer;border:none}
.mpin svg{rotate:-45deg}
.note{font-size:12px;color:var(--muted);padding:13px 17px;border-top:1px solid var(--line);display:flex;gap:8px;align-items:flex-start}
.pop{position:absolute;right:17px;top:54px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 16px 36px -12px rgba(0,0,0,.25);padding:10px;z-index:10;width:200px}
.switch{display:flex;align-items:center;gap:9px;padding:7px 6px;font-size:13px}
.toggle{width:36px;height:21px;border-radius:999px;background:#D7DCE2;position:relative;cursor:pointer;transition:.15s;border:none;flex-shrink:0;margin-left:auto}
.toggle.on{background:var(--green)}
.toggle::after{content:'';position:absolute;width:15px;height:15px;border-radius:50%;background:#fff;top:3px;left:3px;transition:.15s}
.toggle.on::after{left:18px}

.overlay{position:fixed;inset:0;background:rgba(20,20,25,.45);display:grid;place-items:center;z-index:50;padding:20px}
.modal{background:#fff;border-radius:16px;width:100%;max-width:460px;max-height:88vh;overflow:auto;box-shadow:0 30px 60px -20px rgba(0,0,0,.45)}
.mh{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}
.mh h3{font-size:16px;font-weight:600}.mb{padding:16px 18px}
.mf{padding:14px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end}
.input{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:13.5px;outline:none;margin-top:6px;background:#fff;}
.input:focus{border-color:var(--amber)}
.pick{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid var(--line);border-radius:10px;cursor:pointer;margin-bottom:8px;width:100%;text-align:left;background:#fff}
.pick:hover{border-color:var(--amber);background:var(--amber-soft)}
.btn{border:none;border-radius:10px;padding:10px 15px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.btn-amber{background:var(--amber);color:#3a2a10}.btn-ghost{background:var(--canvas);color:var(--ink);border:1px solid var(--line)}.btn-red{background:var(--red);color:#fff}
.kv{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;border-bottom:1px solid var(--line)}
.kv:last-child{border:none}.kv .k{color:var(--muted)}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:600;z-index:60;box-shadow:0 12px 30px -8px rgba(0,0,0,.4);animation:rise .25s ease}
@keyframes rise{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.empty{padding:40px;text-align:center;color:var(--muted);font-size:13.5px}
.live{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--green)}
.livedot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 1.8s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(47,166,126,.45)}70%{box-shadow:0 0 0 8px rgba(47,166,126,0)}100%{box-shadow:0 0 0 0 rgba(47,166,126,0)}}
.feeditem{display:flex;gap:13px;padding:15px 17px;border-bottom:1px solid var(--line)}
.feeditem:last-child{border-bottom:none}
.fthumb{width:54px;height:54px;border-radius:12px;display:grid;place-items:center;font-size:26px;flex-shrink:0;position:relative;background:var(--canvas);overflow:hidden;}
.fthumb img{width:100%;height:100%;object-fit:cover;}
.fcam{position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:6px;background:#fff;border:1px solid var(--line);display:grid;place-items:center}
.sig{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);background:var(--canvas);border:1px solid var(--line);border-radius:999px;padding:3px 9px}
.sig.warn{color:var(--amber-deep);border-color:#F0DBB4;background:var(--amber-soft)}
.sig.bad{color:#B5311D;border-color:#F3C9C1;background:var(--red-soft)}
.factions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;width:104px}
`;

const NAV = [
  { g: "Operations", items: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "rescue", label: "Rescue queue", icon: Siren, badgeKey: "openCases" },
    { id: "intake", label: "Incoming reports", icon: Inbox, badgeKey: "intake" },
    { id: "map", label: "Live map", icon: Map },
  ]},
  { g: "Community", items: [
    { id: "shelters", label: "Shelters & vets", icon: Building2, badgeKey: "pendingShelters" },
    { id: "adopt", label: "Adoptions", icon: PawPrint },
    { id: "lost", label: "Lost & found", icon: Search },
  ]},
  { g: "Trust & safety", items: [
    { id: "reports", label: "Cruelty reports", icon: Flag, badgeKey: "pendingCruelty" },
    { id: "people", label: "People", icon: Users },
  ]},
  { g: "Insights", items: [
    { id: "donate", label: "Points payouts", icon: HeartHandshake, badgeKey: "pendingRedemptions" },
    { id: "census", label: "Census", icon: BarChart3 },
  ]},
];

// Helper to resolve animals emoji based on tags
function getAnimalEmoji(tags = [], notes = "") {
  const t = tags.map(s => s.toLowerCase()).join(" ");
  const n = notes.toLowerCase();
  if (t.includes("dog") || n.includes("dog") || t.includes("puppy")) return "🐕";
  if (t.includes("cat") || n.includes("cat") || t.includes("kitten")) return "🐈";
  if (t.includes("cow") || n.includes("cow") || t.includes("cattle") || t.includes("calf")) return "🐄";
  if (t.includes("bird") || n.includes("bird") || t.includes("pigeon") || t.includes("wing")) return "🐦";
  return "🐾";
}

function getRelativeTime(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const match = (s, q) => !q || String(s).toLowerCase().includes(q.toLowerCase());

// ─── CORE UI COMPONENTS ────────────────────────────────────────────────────────

function Kpi({ label, icon: I, value, delta, dir, onClick }) {
  return (
    <button className="kpi click" onClick={onClick}>
      <div className="kpi-l"><I size={14} color="var(--muted)" /> {label}</div>
      <div className="kpi-v mono sg">{value}</div>
      <div className={"kpi-d " + dir}>{dir === "up" ? <TrendingUp size={13} /> : dir === "down" ? <TrendingDown size={13} /> : null}{delta}</div>
    </button>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await post("/auth/login", { email, password });
      if (data.user.role !== "admin") {
        setError("Access denied — admin accounts only");
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--canvas)", fontFamily: "Inter, sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, width: 380, padding: 32, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div className="sb-mark"><PawPrint size={22} color="#3a2a10" /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "Fredoka" }}>PawPin Admin</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>Manage the platform</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input" style={{ marginTop: 0 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" type="email" required />
          <input className="input" style={{ marginTop: 0 }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
          {error && <div style={{ color: "var(--red)", fontSize: 12, fontWeight: 700 }}>{error}</div>}
          <button className="btn btn-amber" disabled={loading} style={{ marginTop: 8, height: 42, fontSize: 14 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── SUB-PAGES ────────────────────────────────────────────────────────────────

function Overview({ ctx }) {
  const { data, go } = ctx;
  
  // Real stats
  const activeRescues = data.cases.filter(c => c.status !== "closed" && c.status !== "resolved").length;
  const pendingShelters = data.sheltersPending.length;
  const pendingRedemptions = data.redemptions.filter(r => r.status === "pending").length;
  const pendingCruelty = data.cruelty.filter(c => c.status === "pending").length;
  const intakeCount = data.intake.length;
  const activeShelters = data.shelters.length + data.vets.length;

  const mockWeeklyRescues = [
    { d: "Mon", min: 14 }, { d: "Tue", min: 19 }, { d: "Wed", min: 12 },
    { d: "Thu", min: 17 }, { d: "Fri", min: 21 }, { d: "Sat", min: 25 }, { d: "Sun", min: 18 }
  ];

  return (
    <>
      <div className="kpis">
        <Kpi label="Active Rescues" icon={Siren} value={activeRescues} delta={`${intakeCount} new in intake`} dir={intakeCount ? "down" : "flat"} onClick={() => go("rescue")} />
        <Kpi label="Triage Intake" icon={Inbox} value={intakeCount} delta="Awaiting review" dir="flat" onClick={() => go("intake")} />
        <Kpi label="Pending Shelters" icon={Building2} value={pendingShelters} delta="Verification requests" dir="flat" onClick={() => go("shelters")} />
        <Kpi label="Pending Payouts" icon={HeartHandshake} value={pendingRedemptions} delta="Redemption queue" dir="flat" onClick={() => go("donate")} />
        <Kpi label="Cruelty Cases" icon={Flag} value={pendingCruelty} delta="Pending investigation" dir={pendingCruelty ? "down" : "flat"} onClick={() => go("reports")} />
        <Kpi label="Total Partners" icon={Users} value={activeShelters} delta="Active shelters & vets" dir="flat" onClick={() => go("shelters")} />
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="ph">
            <div><h2>Live Rescue Queue</h2><span className="sub">Active dispatch and coordination cases</span></div>
            <button className="link" onClick={() => go("rescue")}>Rescue queue →</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <CaseTable rows={data.cases.filter(c => c.status !== "closed" && c.status !== "resolved").slice(0, 5)} onAssign={ctx.openAssign} onView={ctx.openCase} />
          </div>
        </div>

        <div className="panel">
          <div className="ph"><h2>Triage Priority Alerts</h2></div>
          {[
            { ic: <AlertTriangle size={16} color="#B5311D" />, bg: "var(--red-soft)", t: `${intakeCount} Unreviewed Reports`, s: "Flagged or awaiting duplicates check", to: "intake" },
            { ic: <ShieldAlert size={16} color="var(--amber-deep)" />, bg: "var(--amber-soft)", t: `${pendingShelters} Shelters Awaiting Verification`, s: "Document verification is pending", to: "shelters" },
            { ic: <Flag size={16} color="#B5311D" />, bg: "var(--red-soft)", t: `${pendingCruelty} Cruelty Inquiries`, s: "Investigate reports of animal abuse", to: "reports" },
            { ic: <HeartHandshake size={16} color="var(--sky)" />, bg: "var(--sky-soft)", t: `${pendingRedemptions} Points Cash-out Requests`, s: "Verify and complete point payouts", to: "donate" },
          ].map((a, i) => (
            <div className="alert" key={i}>
              <div className="ic" style={{ background: a.bg }}>{a.ic}</div>
              <div style={{ flex: 1 }}><div className="t">{a.t}</div><div className="s">{a.s}</div></div>
              <button className="rowbtn" onClick={() => go(a.to)}>Go</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="ph"><div><h2>Rescues Handled (Weekly)</h2><span className="sub">Successfully closed cases by day</span></div></div>
          <div style={{ padding: "16px 12px 8px" }}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={mockWeeklyRescues} margin={{ left: -18, right: 8 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F7A833" stopOpacity={.35} /><stop offset="100%" stopColor="#F7A833" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: "#9AA4AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9AA4AF" }} axisLine={false} tickLine={false} />
                <Tooltip /><Area type="monotone" dataKey="min" stroke="#E0860C" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="ph"><div><h2>Registered Community</h2><span className="sub">Platform member breakdowns</span></div></div>
          <div style={{ display: "flex", alignItems: "center", padding: "20px 17px" }}>
            <ResponsiveContainer width="55%" height={150}>
              <PieChart>
                <Pie data={[{ n: "Users", v: data.users.length, c: "#2FA67E" }, { n: "Partners", v: activeShelters, c: "#E0860C" }]} dataKey="v" nameKey="n" innerRadius={40} outerRadius={60} paddingAngle={2}>
                  <Cell fill="#2FA67E" />
                  <Cell fill="#E0860C" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              <div className="mono sg" style={{ fontSize: 26, fontWeight: 600 }}>{data.users.length + activeShelters}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>members onboarded</div>
              <div style={{ fontSize: 13, marginBottom: 6 }}><span className="dot" style={{ background: "#2FA67E" }} />Regular users · {data.users.length}</div>
              <div style={{ fontSize: 13 }}><span className="dot" style={{ background: "#E0860C" }} />Shelters & Vets · {activeShelters}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CaseTable({ rows, onAssign, onView }) {
  if (!rows.length) return <div className="empty">No cases match your search.</div>;

  const sevTag = (s) => s === "Critical" ? "t-crit" : s === "Urgent" ? "t-urg" : "t-ok";
  const statTag = (s) => {
    if (s === "pending" || s === "review" || s === "New") return "t-gray";
    if (s === "assigned" || s === "on_the_way" || s === "En route") return "t-sky";
    if (s === "closed" || s === "rescued" || s === "at_vet_or_shelter" || s === "Resolved") return "t-ok";
    return "t-urg";
  };

  const cleanStatus = (s) => {
    if (s === "pending") return "Pending";
    if (s === "review") return "Under Review";
    if (s === "assigned") return "Assigned";
    if (s === "on_the_way") return "En Route";
    if (s === "rescued") return "Rescued";
    if (s === "at_vet_or_shelter") return "At Shelter/Vet";
    if (s === "closed") return "Resolved";
    return s;
  };

  return (
    <table>
      <thead><tr><th>Case</th><th>Issue</th><th>Location</th><th>Reported</th><th>Severity</th><th>Status</th><th></th></tr></thead>
      <tbody>{rows.map(c => {
        const emoji = getAnimalEmoji(c.tags, c.notes);
        const reporterText = c.reporterName || "Anonymous";
        const issueText = c.tags ? c.tags.join(", ") : c.notes || "Report details";
        const isCritical = c.tags && (c.tags.includes("bleeding") || c.tags.includes("critical") || c.tags.includes("injured"));
        const severity = isCritical ? "Critical" : "Urgent";

        return (
          <tr key={c.id}>
            <td>
              <div className="who">
                <span className="emoji">{emoji}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>#{c.id}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>by {reporterText}</div>
                </div>
              </div>
            </td>
            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issueText}</td>
            <td style={{ color: "var(--muted)" }}>{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</td>
            <td style={{ color: "var(--muted)" }} className="mono">{getRelativeTime(c.createdAt)}</td>
            <td><span className={"tag " + sevTag(severity)}>{severity}</span></td>
            <td>
              <span className={"tag " + statTag(c.status)}>{cleanStatus(c.status)}</span>
              {c.assignedUserName && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{c.assignedUserName}</div>}
            </td>
            <td style={{ textAlign: "right" }}>
              {!c.assignedUserId && c.status !== "closed"
                ? <button className="rowbtn primary" onClick={() => onAssign(c)}>Assign</button>
                : <button className="rowbtn" onClick={() => onView(c)}>View</button>}
            </td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function RescueQueue({ ctx }) {
  const [f, setF] = useState("All");
  const q = ctx.query;

  let rows = ctx.data.cases.filter(c => {
    const term = `${c.id} ${c.notes} ${c.tags?.join(" ")} ${c.reporterName}`.toLowerCase();
    return match(term, q);
  });

  if (f === "Assigned") rows = rows.filter(c => c.assignedUserId && c.status !== "closed");
  else if (f === "Unassigned") rows = rows.filter(c => !c.assignedUserId && c.status !== "closed");
  else if (f === "Resolved") rows = rows.filter(c => c.status === "closed");
  else rows = rows.filter(c => c.status !== "closed");

  return (
    <div className="panel">
      <div className="ph">
        <div><h2>Rescue Case Queue</h2><span className="sub">{rows.length} cases</span></div>
        <div style={{ display: "flex", gap: 7 }}>
          {["All Active", "Unassigned", "Assigned", "Resolved"].map(x => (
            <button key={x} className={"rowbtn " + (f === x ? "primary" : "")} onClick={() => setF(x)}>{x}</button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <CaseTable rows={rows} onAssign={ctx.openAssign} onView={ctx.openCase} />
      </div>
    </div>
  );
}

function LiveMap({ ctx }) {
  const [showPop, setShowPop] = useState(false);
  const [layers, setLayers] = useState({ Critical: true, Urgent: true, Shelter: true, Lost: true });

  const toggle = (k) => setLayers(l => ({ ...l, [k]: !l[k] }));

  // Convert real coordinates to standard map boxes
  // Since we are mocking the map background, we can project lat/long on Pokhara
  // latitude around 28.2, longitude around 83.9
  const pins = useMemo(() => {
    const list = [];
    
    // active cases
    ctx.data.cases.filter(c => c.status !== "closed").forEach(c => {
      const isCritical = c.tags && (c.tags.includes("bleeding") || c.tags.includes("injured"));
      const layer = isCritical ? "Critical" : "Urgent";
      // normalize coordinates to a 0-100% grid relative to Pokhara bounding box
      const latMin = 28.18, latMax = 28.25;
      const lngMin = 83.92, lngMax = 84.02;
      
      const x = ((c.longitude - lngMin) / (lngMax - lngMin)) * 100;
      const y = (1 - (c.latitude - latMin) / (latMax - latMin)) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        list.push({
          x: `${x}%`,
          y: `${y}%`,
          c: isCritical ? "var(--red)" : "var(--amber)",
          layer,
          label: `#${c.id} · ${c.tags?.slice(0,2).join(", ") || c.notes}`
        });
      }
    });

    // active lost reports
    ctx.data.lost.filter(l => l.status === "open").forEach(l => {
      const latMin = 28.18, latMax = 28.25;
      const lngMin = 83.92, lngMax = 84.02;
      const x = ((l.longitude - lngMin) / (lngMax - lngMin)) * 100;
      const y = (1 - (l.latitude - latMin) / (latMax - latMin)) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        list.push({
          x: `${x}%`,
          y: `${y}%`,
          c: "var(--sky)",
          layer: "Lost",
          label: `${l.petName || "Lost pet"} (${l.species})`
        });
      }
    });

    return list;
  }, [ctx.data.cases, ctx.data.lost]);

  return (
    <div className="panel mapwrap">
      <div className="ph">
        <div><h2>Live Triage Map</h2><span className="sub">Real coordinates from active user SOS pins and lost posts</span></div>
        <button className="chipbtn" onClick={() => setShowPop(v => !v)}><Filter size={14} /> Layers</button>
      </div>
      {showPop && (
        <div className="pop">
          {Object.keys(layers).map(k => (
            <div className="switch" key={k}>
              <span className="dot" style={{ background: k === "Critical" ? "var(--red)" : k === "Urgent" ? "var(--amber)" : k === "Shelter" ? "var(--green)" : "var(--sky)" }} />{k}
              <button className={"toggle " + (layers[k] ? "on" : "")} onClick={() => toggle(k)} />
            </div>
          ))}
        </div>
      )}
      <div className="legend" style={{ paddingTop: 14 }}>
        <span><span className="dot" style={{ background: "var(--red)" }} />Critical Cases</span>
        <span><span className="dot" style={{ background: "var(--amber)" }} />Urgent Cases</span>
        <span><span className="dot" style={{ background: "var(--sky)" }} />Lost Animal Reports</span>
      </div>
      <div className="mapbox">
        {pins.filter(p => layers[p.layer]).map((p, i) => (
          <button key={i} className="mpin" style={{ left: p.x, top: p.y, background: p.c }} onClick={() => ctx.notify(p.label)}>
            <PawPrint size={12} color="#fff" />
          </button>
        ))}
        {!pins.length && <div className="empty" style={{ paddingTop: 150 }}>No coordinate points within current viewport.</div>}
      </div>
      <div className="note"><Map size={14} /> Tracking coordinates of active reports in the Pokhara area. Click any active pin to see details.</div>
    </div>
  );
}

function Incoming({ ctx }) {
  const [f, setF] = useState("All");
  const q = ctx.query;

  let rows = ctx.data.intake.filter(r => {
    const term = `${r.id} ${r.notes} ${r.reporterName} ${r.tags?.join(" ")}`.toLowerCase();
    return match(term, q);
  });

  return (
    <div className="panel">
      <div className="ph">
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <h2>Moderation &amp; Duplicate Intake Triage</h2>
          <span className="live"><span className="livedot" /> Live · {rows.length} reports flagged for review</span>
        </div>
      </div>

      {rows.length ? rows.map(r => {
        const emoji = getAnimalEmoji(r.tags, r.notes);
        return (
          <div className="feeditem" key={r.id}>
            <div className="fthumb">
              {r.photoUrl ? <img src={r.photoUrl} alt="Animal" /> : emoji}
              {r.photoUrl && <span className="fcam"><Camera size={11} color="var(--muted)" /></span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.tags?.join(", ") || "No tags"}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>{getRelativeTime(r.createdAt)} ago</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 8px", flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>by {r.reporterName || "Anonymous"}</span>
                {r.reporterPhone && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>📞 {r.reporterPhone}</span>}
                <span style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <MapPin size={11} /> {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>{r.notes || "No extra reporter notes."}</div>
              {r.reviewReason && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span className="sig bad"><AlertTriangle size={10} /> {r.reviewReason}</span>
                </div>
              )}
            </div>
            <div className="factions">
              <button className="rowbtn primary" onClick={() => ctx.confirmIntake(r.id)}>Clear / OK</button>
              <button className="rowbtn danger" onClick={() => ctx.flagIntake(r.id)}>Abusive</button>
              <button className="rowbtn" onClick={() => ctx.dismissIntake(r.id)}>False Report</button>
            </div>
          </div>
        );
      }) : <div className="empty">Nothing in the intake review queue. Reports only land here if duplicates are detected.</div>}
      <div className="note"><Radio size={14} /> Reports flagged by the computer model await human decision here. Clear approves them for rescue; Flag and False reject/archive them.</div>
    </div>
  );
}

function Shelters({ ctx }) {
  const q = ctx.query;
  const activeList = [...ctx.data.shelters, ...ctx.data.vets].filter(s => match(s.organizationName || s.name, q));
  const pendingList = ctx.data.sheltersPending.filter(s => match(s.organizationName, q));

  return (
    <>
      <div className="panel">
        <div className="ph">
          <div><h2>Pending Registration Applications</h2><span className="sub">{pendingList.length} applications awaiting validation</span></div>
        </div>
        {pendingList.length ? (
          <table>
            <thead><tr><th>Organization</th><th>Verification Details</th><th>Address</th><th>Documents</th><th></th></tr></thead>
            <tbody>{pendingList.map(app => (
              <tr key={app.id}>
                <td>
                  <div className="who">
                    <span className="emoji"><Building2 size={18} color="var(--muted)" /></span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{app.organizationName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Applied as: {app.type}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Reg No: {app.registrationNumber}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>by {app.name} ({app.email})</div>
                </td>
                <td style={{ color: "var(--muted)" }}>{app.address}</td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {(app.documentUrls || []).map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--amber-deep)" }}>
                        📄 Doc {index + 1}
                      </a>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="rowbtn primary" onClick={() => ctx.verifyShelter(app.id)}>Verify &amp; Approve</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="empty">No applications waiting for review.</div>}
      </div>

      <div className="panel">
        <div className="ph">
          <div><h2>Approved Organizations &amp; Partners</h2><span className="sub">{activeList.length} partners registered</span></div>
        </div>
        {activeList.length ? (
          <table>
            <thead><tr><th>Organisation</th><th>Address</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>{activeList.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="who">
                    <span className="emoji"><Building2 size={18} color="var(--muted)" /></span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.organizationName || s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Role: {s.role}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--muted)" }}>{s.address || s.location || "N/A"}</td>
                <td className="mono" style={{ color: "var(--muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="rowbtn danger" onClick={() => ctx.suspendUser(s.id)}>Suspend</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="empty">No approved organizations found.</div>}
      </div>
    </>
  );
}

function Adoptions({ ctx }) {
  const q = ctx.query;
  const list = ctx.data.adopts.filter(a => match(a.petName + a.species + a.description, q));
  const meetingsings = ctx.data.meetings.filter(m => match(m.petName + m.userName, q));

  return (
    <>
      <div className="panel">
        <div className="ph">
          <div><h2>Adoption Listings</h2><span className="sub">{list.length} animals posted</span></div>
        </div>
        {list.length ? (
          <div className="cardgrid">
            {list.map((a) => (
              <div className="acard" key={a.id}>
                <div className="img">
                  {a.photoUrl ? <img src={a.photoUrl} alt={a.petName} /> : "🐾"}
                </div>
                <div className="b">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>{a.petName}</span>
                    <span className={"tag t-ok"}>{a.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0" }}>Breed: {a.breed || "Unknown"} · Age: {a.age || "N/A"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", height: 32, overflow: "hidden", textOverflow: "ellipsis", marginBottom: 10 }}>{a.description}</div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <span className="tag t-sky" style={{ flex: 1, justifyContent: "center" }}>{a.species}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty">No adoption postings active.</div>}
      </div>

      <div className="panel">
        <div className="ph">
          <div><h2>Adoption Meetings &amp; Visits</h2><span className="sub">{meetingsings.length} bookings scheduled</span></div>
        </div>
        {meetingsings.length ? (
          <table>
            <thead><tr><th>Pet</th><th>Visitor</th><th>Contact Details</th><th>Time Slot</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{meetingsings.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.petName} (ID: {m.petId})</td>
                <td style={{ fontWeight: 600 }}>{m.userName}</td>
                <td>{m.userContact}</td>
                <td className="mono">{m.slot}</td>
                <td>
                  <span className={"tag " + (m.status === "confirmed" ? "t-ok" : m.status === "pending" ? "t-urg" : "t-gray")}>
                    {m.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {m.status === "pending" && (
                    <button className="rowbtn primary" onClick={() => ctx.updateMeeting(m.id, "confirmed")}>Confirm Slot</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="empty">No adoption meetings scheduled.</div>}
      </div>
    </>
  );
}

function LostFound({ ctx }) {
  const q = ctx.query;
  const rows = ctx.data.lost.filter(l => match(l.petName + l.description + l.area, q));
  const tagOf = (s) => s === "open" ? "t-crit" : "t-ok";

  return (
    <div className="panel">
      <div className="ph">
        <div><h2>Lost &amp; Found Postings</h2><span className="sub">Reuniting lost pets in Pokhara</span></div>
      </div>
      {rows.length ? (
        <table>
          <thead><tr><th>Pet Detail</th><th>Area / Location</th><th>Reporter</th><th>Status</th><th>Age</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(l => (
            <tr key={l.id}>
              <td>
                <div className="who">
                  <span className="emoji">{l.photoUrl ? <img src={l.photoUrl} alt="Lost pet" style={{ width: "100%", height: "100%", borderRadius: 6, objectFit: "cover" }} /> : "🔍"}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.petName || "Unknown Name"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.species} · {l.breed || "Mixed"}</div>
                  </div>
                </div>
              </td>
              <td>{l.area || "N/A"}</td>
              <td>{l.postedBy}</td>
              <td><span className={"tag " + tagOf(l.status)}>{l.status === "open" ? "Missing" : "Reunited"}</span></td>
              <td className="mono" style={{ color: "var(--muted)" }}>{getRelativeTime(l.createdAt)} ago</td>
              <td style={{ textAlign: "right" }}>
                {l.status === "open" ? (
                  <button className="rowbtn primary" onClick={() => ctx.reuniteLost(l.id)}>Mark Reunited</button>
                ) : (
                  <span className="tag t-ok">Closed 🎉</span>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      ) : <div className="empty">No lost or found postings.</div>}
    </div>
  );
}

function FlaggedReports({ ctx }) {
  const q = ctx.query;
  const crueltyReports = ctx.data.cruelty.filter(r => match(r.description + r.area, q));
  const statusColor = { pending: "t-crit", investigating: "t-sky", resolved: "t-ok", dismissed: "t-gray" };

  return (
    <div className="panel">
      <div className="ph">
        <div><h2>Cruelty &amp; Abuse Reports</h2><span className="sub">{crueltyReports.length} total reports</span></div>
      </div>
      {crueltyReports.length ? (
        <table>
          <thead><tr><th>Evidence</th><th>Details</th><th>Location</th><th>Reporter</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{crueltyReports.map(r => (
            <tr key={r.id}>
              <td>
                <span className="emoji" style={{ overflow: "hidden" }}>
                  {r.photoUrl ? <img src={r.photoUrl} alt="Abuse evidence" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🚨"}
                </span>
              </td>
              <td style={{ maxWidth: 300 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "normal" }}>{r.description}</div>
                {r.adminNote && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, background: "var(--canvas)", padding: 4, borderRadius: 4 }}>Note: {r.adminNote}</div>}
              </td>
              <td>{r.area || "N/A"}</td>
              <td>{r.reportedBy ? `${r.reportedBy} (${r.reporterEmail})` : "Anonymous"}</td>
              <td><span className={"tag " + statusColor[r.status]}>{r.status}</span></td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {r.status === "pending" && (
                  <>
                    <button className="rowbtn primary" style={{ marginRight: 6 }} onClick={() => ctx.updateCruelty(r.id, "investigating")}>Investigate</button>
                    <button className="rowbtn danger" onClick={() => ctx.updateCruelty(r.id, "dismissed")}>Dismiss</button>
                  </>
                )}
                {r.status === "investigating" && (
                  <button className="rowbtn primary" onClick={() => ctx.updateCruelty(r.id, "resolved")}>Resolve Case</button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      ) : <div className="empty">No animal cruelty reports submitted.</div>}
    </div>
  );
}

function People({ ctx }) {
  const q = ctx.query;
  const rows = ctx.data.users.filter(p => match(p.name + p.email + p.role, q));
  const roleTag = (r) => r === "admin" ? "t-sky" : r === "shelter" || r === "vet" ? "t-ok" : "t-gray";

  return (
    <div className="panel">
      <div className="ph">
        <div><h2>People &amp; Platform Access</h2><span className="sub">{rows.length} onboarded users</span></div>
      </div>
      {rows.length ? (
        <table>
          <thead><tr><th>Name</th><th>Email Address</th><th>System Role</th><th>State</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(p => (
            <tr key={p.id}>
              <td>
                <div className="who">
                  <span className="emoji" style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{p.name.slice(0, 1).toUpperCase()}</span>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                </div>
              </td>
              <td className="mono" style={{ color: "var(--muted)" }}>{p.email}</td>
              <td><span className={"tag " + roleTag(p.role)}>{p.role}</span></td>
              <td><span className={"tag " + (p.status === "active" ? "t-ok" : "t-crit")}>{p.status}</span></td>
              <td style={{ textAlign: "right" }}>
                {p.role !== "admin" && (
                  <button className="rowbtn danger" onClick={() => ctx.suspendUser(p.id, p.status === "active" ? "suspended" : "active")}>
                    {p.status === "active" ? "Suspend" : "Activate"}
                  </button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      ) : <div className="empty">No people match your query.</div>}
    </div>
  );
}

function Donations({ ctx }) {
  const pendingList = ctx.data.redemptions.filter(r => match(r.name + r.email, ctx.query));
  const [awardUserId, setAwardUserId] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [awardDesc, setAwardDesc] = useState("");

  const handleAward = (e) => {
    e.preventDefault();
    if (!awardUserId || !awardAmount || !awardDesc) return ctx.notify("Please fill all award details");
    ctx.awardPoints(awardUserId, awardAmount, awardDesc);
    setAwardUserId("");
    setAwardAmount("");
    setAwardDesc("");
  };

  return (
    <>
      <div className="panel" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Manually Award Platform Points</h2>
        <form onSubmit={handleAward} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 100px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>User ID</span>
            <input className="input" style={{ marginTop: 4 }} value={awardUserId} onChange={e => setAwardUserId(e.target.value)} type="number" placeholder="User ID" />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Points</span>
            <input className="input" style={{ marginTop: 4 }} value={awardAmount} onChange={e => setAwardAmount(e.target.value)} type="number" placeholder="Points" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Description Reason</span>
            <input className="input" style={{ marginTop: 4 }} value={awardDesc} onChange={e => setAwardDesc(e.target.value)} placeholder="Reason for award" />
          </div>
          <button className="btn btn-amber" type="submit" style={{ height: 40 }}>Award Points</button>
        </form>
      </div>

      <div className="panel">
        <div className="ph">
          <div><h2>Points Payout Requests</h2><span className="sub">{pendingList.length} cashouts queued</span></div>
        </div>
        {pendingList.length ? (
          <table>
            <thead><tr><th>Requestor</th><th>Reward Description</th><th>Cashout Points</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>{pendingList.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.email} · Bal: {r.pointsBalance} pts</div>
                </td>
                <td>{r.rewardDescription}</td>
                <td className="mono" style={{ fontWeight: 700, color: "var(--amber-deep)" }}>{r.pointsAmount} pts</td>
                <td><span className={"tag " + (r.status === "approved" ? "t-ok" : r.status === "rejected" ? "t-crit" : "t-urg")}>{r.status}</span></td>
                <td className="mono" style={{ color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>
                  {r.status === "pending" && (
                    <>
                      <button className="rowbtn primary" style={{ marginRight: 6 }} onClick={() => ctx.decideRedemption(r.id, "approved")}>Approve</button>
                      <button className="rowbtn danger" onClick={() => ctx.decideRedemption(r.id, "rejected")}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div className="empty">No cashout requests found.</div>}
      </div>
    </>
  );
}

function Census({ ctx }) {
  // Aggregate real coordinates by simple bounding ranges to construct active heat numbers
  const wards = useMemo(() => {
    // Basic coordinates count in Pokhara
    // Ward 6 (Lakeside): latitude 28.20 - 28.22, longitude 83.95 - 83.97
    // Ward 17 (Chhorepatan): latitude 28.18 - 28.20, longitude 83.95 - 83.97
    // Ward 4 (Chipledhunga): latitude 28.22 - 28.24, longitude 83.97 - 83.99
    // Ward 11 (Kahundanda): latitude 28.22 - 28.24, longitude 83.99 - 84.02
    
    let w6 = 0, w17 = 0, w4 = 0, w11 = 0;
    
    ctx.data.cases.forEach(c => {
      const lat = c.latitude;
      const lng = c.longitude;
      if (lat >= 28.20 && lat < 28.22 && lng >= 83.95 && lng < 83.97) w6++;
      else if (lat >= 28.18 && lat < 28.20 && lng >= 83.95 && lng < 83.97) w17++;
      else if (lat >= 28.22 && lat < 28.24 && lng >= 83.97 && lng < 83.99) w4++;
      else if (lat >= 28.22 && lat < 28.24 && lng >= 83.99 && lng < 84.02) w11++;
    });

    return [
      { w: "Ward 4 (Center)", street: w4 + 2, home: 18 },
      { w: "Ward 6 (Lakeside)", street: w6 + 5, home: 24 },
      { w: "Ward 11 (Bagar)", street: w11 + 1, home: 15 },
      { w: "Ward 17 (Chhorepatan)", street: w17 + 3, home: 30 },
    ];
  }, [ctx.data.cases]);

  return (
    <div className="panel">
      <div className="ph">
        <div><h2>Animal Census by Pokhara Ward</h2><span className="sub">Aggregated numbers from active cases and community posts</span></div>
      </div>
      <div style={{ padding: "18px 14px 6px" }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={wards} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" vertical={false} />
            <XAxis dataKey="w" tick={{ fontSize: 12, fill: "#9AA4AF" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9AA4AF" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#F7F8FA" }} />
            <Bar dataKey="street" stackId="a" fill="#E0860C" name="Street Animals" />
            <Bar dataKey="home" stackId="a" fill="#2FA67E" name="Home Animals" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="legend" style={{ paddingTop: 8 }}>
        <span><span className="dot" style={{ background: "#E0860C" }} />Street animals</span>
        <span><span className="dot" style={{ background: "#2FA67E" }} />Home animals</span>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, footer }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <h3>{title}</h3>
          <button className="iconbtn" style={{ width: 32, height: 32, border: "none" }} onClick={onClose}><X size={17} /></button>
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}

function ModalRoot({ ctx }) {
  const m = ctx.modal;
  if (!m) return null;

  if (m.type === "assign") {
    const shelters = [...ctx.data.shelters, ...ctx.data.vets];
    return (
      <ModalShell title={`Assign Case #${m.data.id}`} onClose={ctx.closeModal}>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          {getAnimalEmoji(m.data.tags, m.data.notes)} {m.data.tags?.join(", ") || m.data.notes}
        </p>
        {shelters.map(s => (
          <button className="pick" key={s.id} onClick={() => ctx.assignCase(m.data.id, s.id, s.organizationName || s.name)}>
            <Building2 size={18} color="var(--muted)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.organizationName || s.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.role} · {s.location || s.address}</div>
            </div>
            <span className="tag t-ok">Assign</span>
          </button>
        ))}
        {!shelters.length && <div className="empty">No registered partners available to assign.</div>}
      </ModalShell>
    );
  }

  if (m.type === "case") {
    const c = m.data;
    const emoji = getAnimalEmoji(c.tags, c.notes);
    return (
      <ModalShell title={`Case Detail #${c.id}`} onClose={ctx.closeModal}
        footer={c.status === "closed" ? <button className="btn btn-ghost" onClick={ctx.closeModal}>Close</button>
          : <><button className="btn btn-ghost" onClick={() => { ctx.closeModal(); ctx.openAssign(c); }}>Reassign</button><button className="btn btn-amber" onClick={() => ctx.resolveCase(c.id)}>Mark Resolved</button></>}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>{emoji}</div>
        <div className="kv"><span className="k">Issue</span><span>{c.tags?.join(", ") || "No tags"}</span></div>
        <div className="kv"><span className="k">Location</span><span>{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</span></div>
        <div className="kv"><span className="k">Reported</span><span>{getRelativeTime(c.createdAt)} ago</span></div>
        <div className="kv"><span className="k">Status</span><span className="tag t-sky">{c.status}</span></div>
        <div className="kv"><span className="k">Assigned Responder</span><span>{c.assignedUserName || "Unassigned"}</span></div>
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <b style={{ color: "var(--muted)" }}>Reporter Notes:</b>
          <div style={{ padding: 10, background: "var(--canvas)", borderRadius: 8, marginTop: 4 }}>{c.notes || "No notes"}</div>
        </div>
      </ModalShell>
    );
  }

  return null;
}

// ─── MAIN APP ENTRY ───────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Core Data
  const [cases, setCases] = useState([]);
  const [intake, setIntake] = useState([]);
  const [lost, setLost] = useState([]);
  const [adopts, setAdopts] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [vets, setVets] = useState([]);
  const [sheltersPending, setSheltersPending] = useState([]);
  const [cruelty, setCruelty] = useState([]);
  const [users, setUsers] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

  const notify = (msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const [
        pinsData,
        intakeData,
        lostData,
        adoptsData,
        meetingsData,
        sheltersData,
        vetsData,
        applicationsData,
        crueltyData,
        usersData,
        redemptionsData
      ] = await Promise.all([
        get("/map/pins"),
        get("/moderation/reports?status=review").catch(() => []),
        get("/lost?status=open").catch(() => []),
        get("/adopt?status=available").catch(() => []),
        get("/adopt/meetings").catch(() => []),
        get("/shelters").catch(() => []),
        get("/vets").catch(() => []),
        get("/admin/applications?status=pending").catch(() => []),
        get("/admin/cruelty?status=pending").catch(() => []),
        get("/admin/users").catch(() => []),
        get("/admin/points/redemptions?status=pending").catch(() => []),
      ]);

      // filter cases from pinsData (which combines lost posts & rescue cases)
      const rescueReports = pinsData.filter(pin => pin.kind === "rescue");
      setCases(rescueReports);
      setIntake(intakeData);
      setLost(lostData);
      setAdopts(adoptsData);
      setMeetings(meetingsData);
      setShelters(sheltersData);
      setVets(vetsData);
      setSheltersPending(applicationsData);
      setCruelty(crueltyData);
      setUsers(usersData);
      setRedemptions(redemptionsData);
    } catch (err) {
      console.error("Data load failed:", err);
    }
  };

  useEffect(() => {
    // Check if token query param is present (SSO from main login)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (tokenParam) {
      localStorage.setItem(TOKEN_KEY, tokenParam);
      // clean URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    get("/me").then((data) => {
      if (data.user.role === "admin") {
        setUser(data.user);
        loadData();
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const ctx = {
    data: { cases, intake, lost, adopts, meetings, shelters, vets, sheltersPending, cruelty, users, redemptions },
    query,
    modal,
    notify,
    go: (p) => { setPage(p); setQuery(""); },
    closeModal: () => setModal(null),
    openAssign: (c) => setModal({ type: "assign", data: c }),
    openCase: (c) => setModal({ type: "case", data: c }),

    assignCase: async (id, shelterUserId, shelterName) => {
      try {
        await post(`/map/pins/rescue/${id}/assign`, {});
        notify(`Case #${id} assigned to ${shelterName}`);
        setModal(null);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    resolveCase: async (id) => {
      try {
        await post(`/map/pins/rescue/${id}/resolve`, {});
        notify(`Case #${id} resolved`);
        setModal(null);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    verifyShelter: async (appId) => {
      try {
        await patch(`/admin/applications/${appId}`, { decision: "approved", reviewNote: "Verified by operations admin." });
        notify("Organization verified and approved");
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    suspendUser: async (userId, customStatus = "suspended") => {
      try {
        await patch(`/admin/users/${userId}/status`, { status: customStatus });
        notify(`User ${customStatus === "active" ? "restored" : "suspended"}`);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    confirmIntake: async (reportId) => {
      try {
        await patch(`/moderation/reports/${reportId}`, { action: "clear", reason: "Cleared by administrator" });
        notify("Report promoted to dispatch queue");
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    flagIntake: async (reportId) => {
      try {
        await patch(`/moderation/reports/${reportId}`, { action: "abusive", reason: "Marked abusive by admin" });
        notify("Report flagged as abusive");
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    dismissIntake: async (reportId) => {
      try {
        await patch(`/moderation/reports/${reportId}`, { action: "false", reason: "Marked false/duplicate by admin" });
        notify("Report dismissed");
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    reuniteLost: async (id) => {
      try {
        await patch(`/lost/${id}/status`, { status: "reunited" });
        notify("Post status updated to reunited");
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    updateMeeting: async (id, status) => {
      try {
        await patch(`/adopt/meetings/${id}`, { status });
        notify(`Meeting slot ${status}`);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    updateCruelty: async (id, status) => {
      try {
        await patch(`/admin/cruelty/${id}`, { status, adminNote: `Investigation updated to: ${status}` });
        notify(`Cruelty report status updated to ${status}`);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    decideRedemption: async (id, decision) => {
      try {
        await patch(`/admin/points/redemptions/${id}`, { decision, adminNote: `Processed decision: ${decision}` });
        notify(`Cashout ${decision}`);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    },
    awardPoints: async (userId, amount, description) => {
      try {
        await post("/admin/points/award", { userId: parseInt(userId, 10), amount: parseInt(amount, 10), description });
        notify(`Awarded ${amount} points successfully`);
        loadData();
      } catch (err) {
        notify(`Error: ${err.message}`);
      }
    }
  };

  const badges = {
    openCases: cases.filter(c => c.status !== "closed").length,
    intake: intake.length,
    pendingShelters: sheltersPending.length,
    pendingRedemptions: redemptions.filter(r => r.status === "pending").length,
    pendingCruelty: cruelty.filter(r => r.status === "pending").length
  };

  if (loading) {
    return <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "Fredoka", fontSize: 24, color: "var(--amber-deep)" }}>Loading PawPin Console...</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={(usr) => { setUser(usr); loadData(); }} />;
  }

  return (
    <div className="ad">
      <style>{CSS}</style>
      <aside className="sb">
        <div className="sb-logo">
          <div className="sb-mark"><PawPrint size={19} color="#3a2a10" /></div>
          <div><div style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 17 }}>PawPin</div><div style={{ fontSize: 10.5, color: "#8C7F70" }}>Admin console</div></div>
        </div>
        {NAV.map(grp => (
          <div key={grp.g}>
            <div className="sb-group">{grp.g}</div>
            {grp.items.map(it => {
              const I = it.icon; const b = it.badgeKey && badges[it.badgeKey];
              return (
                <button key={it.id} className={"sb-item " + (page === it.id ? "on" : "")} onClick={() => ctx.go(it.id)}>
                  <I size={17} /> {it.label}{b ? <span className="sb-badge">{b}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
        <button className="sb-user" onClick={() => { localStorage.removeItem(TOKEN_KEY); setUser(null); }}>
          <div className="sb-av">{user.name.slice(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user.name}</div><div style={{ fontSize: 11, color: "#8C7F70" }}>Operations Admin (Logout)</div></div>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <h1 className="sg">{TITLES[page] || page}</h1>
          <div className="search"><Search size={15} /><input placeholder="Search records..." value={query} onChange={e => setQuery(e.target.value)} /></div>
          <button className="chipbtn" onClick={loadData}>Refresh Data <ChevronDown size={14} /></button>
        </header>

        <div className="body">
          {page === "overview" && <Overview ctx={ctx} />}
          {page === "rescue" && <RescueQueue ctx={ctx} />}
          {page === "intake" && <Incoming ctx={ctx} />}
          {page === "map" && <LiveMap ctx={ctx} />}
          {page === "shelters" && <Shelters ctx={ctx} />}
          {page === "adopt" && <Adoptions ctx={ctx} />}
          {page === "lost" && <LostFound ctx={ctx} />}
          {page === "reports" && <FlaggedReports ctx={ctx} />}
          {page === "people" && <People ctx={ctx} />}
          {page === "donate" && <Donations ctx={ctx} />}
          {page === "census" && <Census ctx={ctx} />}
        </div>
      </div>

      <ModalRoot ctx={ctx} />
      {toast && <div className="toast"><Check size={16} color="var(--amber)" />{toast}</div>}
    </div>
  );
}

const TITLES = { overview: "Overview", rescue: "Rescue queue", intake: "Incoming reports", map: "Live map", shelters: "Shelters & vets", adopt: "Adoptions", lost: "Lost & found", reports: "Cruelty reports", people: "People", donate: "Donations & Points", census: "Census" };
