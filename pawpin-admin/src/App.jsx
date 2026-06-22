import { useEffect, useState } from "react";

// ─── config ───────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "pawpin-admin-token";

// ─── colours (matching mobile app) ───────────────────────────────────────────

const C = {
  bg: "#FFF5EC",
  surface: "#FFFFFF",
  ink: "#392A24",
  soft: "#88766C",
  line: "#F0E1D5",
  amber: "#F5A623",
  amberSoft: "#FFF0D5",
  coral: "#FA7659",
  coralSoft: "#FFE8E1",
  sage: "#3E987C",
  sageSoft: "#E3F2EC",
  sos: "#E84C35",
  sosSoft: "#FFE5E1",
};

// ─── global styles ────────────────────────────────────────────────────────────

const STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: ${C.bg}; color: ${C.ink}; font-size: 14px; }
  button { cursor: pointer; font-family: inherit; font-size: 13px; }
  input, textarea, select { font-family: inherit; font-size: 13px; }
  a { color: ${C.amber}; }
`;

// ─── API helpers ──────────────────────────────────────────────────────────────

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

// ─── shared UI ────────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 14, border: `1.5px solid ${C.line}`,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ children, color = C.amber, bg }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 800, padding: "3px 8px",
      borderRadius: 20, background: bg || `${color}22`, color,
    }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }) {
  const variants = {
    primary: { background: C.amber, color: "#fff", border: "none" },
    danger: { background: C.sos, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.ink, border: `1.5px solid ${C.line}` },
    sage: { background: C.sage, color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px", borderRadius: 10, fontWeight: 800,
        opacity: disabled ? 0.4 : 1, ...variants[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`,
      background: C.surface, color: C.ink, ...style,
    }}>
      {children}
    </select>
  );
}

function Input({ value, onChange, placeholder, type = "text", style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "9px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`,
        background: C.surface, color: C.ink, width: "100%", ...style,
      }}
    />
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, background: C.ink, color: "#fff",
      padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13,
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 9999,
    }}>
      {message}
    </div>
  );
}

// ─── login screen ─────────────────────────────────────────────────────────────

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <Card style={{ width: 380, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22 }}>🐾</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>PawPin Admin</div>
            <div style={{ color: C.soft, fontSize: 11 }}>Manage the platform</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input value={email} onChange={setEmail} placeholder="Admin email" type="email" />
          <Input value={password} onChange={setPassword} placeholder="Password" type="password" />
          {error && <div style={{ color: C.sos, fontSize: 12, fontWeight: 700 }}>{error}</div>}
          <Btn disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Signing in..." : "Sign in"}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

// ─── applications section ─────────────────────────────────────────────────────

function Applications({ toast }) {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState({});
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try { setItems(await get(`/admin/applications?status=${status}`)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const review = async (id, decision) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await patch(`/admin/applications/${id}`, { decision, reviewNote: reviewNote[id] || "" });
      toast(`Application ${decision}`);
      await load();
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Shelter / Vet Applications</h2>
        <Select value={status} onChange={setStatus} style={{ marginLeft: "auto" }}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {loading ? (
        <div style={{ color: C.soft }}>Loading…</div>
      ) : items.length === 0 ? (
        <Card><div style={{ color: C.soft, textAlign: "center" }}>No {status} applications</div></Card>
      ) : items.map((app) => (
        <Card key={app.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{app.organizationName}</div>
              <div style={{ color: C.soft, marginTop: 3 }}>{app.email} · {app.name}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge color={C.sky}>{app.type}</Badge>
                <Badge color={status === "approved" ? C.sage : status === "rejected" ? C.sos : C.amber}>
                  {app.status}
                </Badge>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: C.soft }}>
                <div>📍 {app.address}</div>
                <div>🔢 Reg: {app.registrationNumber}</div>
              </div>
              {app.documentUrls?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.soft, marginBottom: 5 }}>DOCUMENTS</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {app.documentUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                        📄 Document {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {status === "pending" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                <textarea
                  placeholder="Review note (optional)"
                  value={reviewNote[app.id] || ""}
                  onChange={(e) => setReviewNote((n) => ({ ...n, [app.id]: e.target.value }))}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 9,
                    border: `1.5px solid ${C.line}`, resize: "vertical",
                    minHeight: 60, fontFamily: "inherit", fontSize: 12, color: C.ink,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="sage" disabled={busy[app.id]} onClick={() => review(app.id, "approved")} style={{ flex: 1 }}>
                    ✓ Approve
                  </Btn>
                  <Btn variant="danger" disabled={busy[app.id]} onClick={() => review(app.id, "rejected")} style={{ flex: 1 }}>
                    ✗ Reject
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </section>
  );
}

// ─── users section ────────────────────────────────────────────────────────────

function Users({ toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try { setUsers(await get("/admin/users")); }
    catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    setBusy((b) => ({ ...b, [user.id]: true }));
    try {
      await patch(`/admin/users/${user.id}/status`, { status: newStatus });
      toast(`User ${newStatus}`);
      await load();
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [user.id]: false }));
    }
  };

  const roleColor = { user: C.soft, shelter: C.sky, vet: C.sage, admin: C.amber };
  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Users</h2>
        <div style={{ flex: 1, maxWidth: 300, marginLeft: "auto" }}>
          <Input value={search} onChange={setSearch} placeholder="Search name or email…" />
        </div>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {loading ? (
        <div style={{ color: C.soft }}>Loading…</div>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, fontSize: 11, fontWeight: 800, color: C.soft }}>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} style={{ borderTop: `1px solid ${C.line}`, background: i % 2 ? C.bg : C.surface }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{user.name}</td>
                  <td style={{ padding: "12px 16px", color: C.soft, fontSize: 12 }}>{user.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge color={roleColor[user.role] || C.soft}>{user.role}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge color={user.status === "active" ? C.sage : C.sos}>{user.status}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.soft, fontSize: 12 }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.role !== "admin" && (
                      <Btn
                        variant={user.status === "active" ? "danger" : "sage"}
                        disabled={busy[user.id]}
                        onClick={() => toggleStatus(user)}
                        style={{ fontSize: 11, padding: "5px 12px" }}
                      >
                        {user.status === "active" ? "Suspend" : "Restore"}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C.soft }}>No users found</div>
          )}
        </Card>
      )}
    </section>
  );
}

// ─── rescue reports section ───────────────────────────────────────────────────

function RescueReports({ toast }) {
  const [status, setStatus] = useState("review");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try { setReports(await get(`/moderation/reports?status=${status}`)); }
    catch { setReports([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const act = async (id, action) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await patch(`/moderation/reports/${id}`, { action, reason: `Admin action: ${action}` });
      toast(`Report marked as ${action}`);
      await load();
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Rescue Reports</h2>
        <Select value={status} onChange={setStatus} style={{ marginLeft: "auto" }}>
          <option value="review">Needs Review</option>
          <option value="pending">Pending</option>
          <option value="false">Marked False</option>
          <option value="abusive">Abusive</option>
        </Select>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {loading ? <div style={{ color: C.soft }}>Loading…</div> :
        reports.length === 0 ? <Card><div style={{ color: C.soft, textAlign: "center" }}>No {status} reports</div></Card> :
        reports.map((report) => {
          const tags = Array.isArray(report.tags) ? report.tags : JSON.parse(report.tags || "[]");
          return (
          <Card key={report.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {report.photoUrl && (
                <img src={report.photoUrl} alt="Report" style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900 }}>Report #{report.id}</span>
                  <Badge color={C.amber}>{report.status}</Badge>
                  {report.duplicateOfReportId && <Badge color={C.soft}>Possible dup of #{report.duplicateOfReportId}</Badge>}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: C.soft }}>
                  📍 {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {tags.map((tag) => <Badge key={tag} color={C.ink}>{tag}</Badge>)}
                </div>
                {(report.reporterName || report.reporterPhone || report.reporterAltContact) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                    <b>Contact:</b> {report.reporterName || "Reporter"}
                    {report.reporterPhone && ` · ${report.reporterPhone}`}
                    {report.reporterAltContact && ` · ${report.reporterAltContact}`}
                  </div>
                )}
                {report.lastStatusNote && (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.soft }}>Latest: {report.lastStatusNote}</div>
                )}
                {report.reviewReason && (
                  <div style={{ marginTop: 6, fontSize: 11, color: C.sos }}>⚠ {report.reviewReason}</div>
                )}
                <div style={{ fontSize: 11, color: C.soft, marginTop: 4 }}>
                  {new Date(report.createdAt).toLocaleString()}
                </div>
              </div>
              {status === "review" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-start" }}>
                  <Btn variant="sage" disabled={busy[report.id]} onClick={() => act(report.id, "clear")}>✓ Clear</Btn>
                  <Btn variant="ghost" disabled={busy[report.id]} onClick={() => act(report.id, "false")}>False</Btn>
                  <Btn variant="danger" disabled={busy[report.id]} onClick={() => act(report.id, "abusive")}>Abusive</Btn>
                </div>
              )}
            </div>
          </Card>
          );
        })
      }
    </section>
  );
}

// ─── cruelty reports section ──────────────────────────────────────────────────

function CrueltyReports({ toast }) {
  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [notes, setNotes] = useState({});

  const load = async () => {
    setLoading(true);
    try { setReports(await get(`/admin/cruelty?status=${status}`)); }
    catch { setReports([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const update = async (id, newStatus) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await patch(`/admin/cruelty/${id}`, { status: newStatus, adminNote: notes[id] || "" });
      toast(`Report updated to ${newStatus}`);
      await load();
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const statusColor = { pending: C.amber, investigating: C.sky, resolved: C.sage, dismissed: C.soft };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Cruelty Reports</h2>
        <Select value={status} onChange={setStatus} style={{ marginLeft: "auto" }}>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </Select>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {loading ? <div style={{ color: C.soft }}>Loading…</div> :
        reports.length === 0 ? <Card><div style={{ color: C.soft, textAlign: "center" }}>No {status} cruelty reports</div></Card> :
        reports.map((report) => (
          <Card key={report.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {report.photoUrl && (
                <img src={report.photoUrl} alt="Evidence" style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 900 }}>Cruelty Report #{report.id}</span>
                  <Badge color={statusColor[report.status] || C.soft}>{report.status}</Badge>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>{report.description}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: C.soft }}>
                  📍 {report.area || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}
                </div>
                {report.reportedBy && (
                  <div style={{ fontSize: 11, color: C.soft, marginTop: 3 }}>
                    Reported by: {report.reportedBy} ({report.reporterEmail})
                  </div>
                )}
                {!report.reportedBy && <div style={{ fontSize: 11, color: C.soft, marginTop: 3 }}>Anonymous report</div>}
                <div style={{ fontSize: 11, color: C.soft, marginTop: 3 }}>
                  {new Date(report.createdAt).toLocaleString()}
                </div>
                {report.adminNote && (
                  <div style={{ marginTop: 6, fontSize: 11, background: C.sageSoft, padding: "6px 10px", borderRadius: 8, color: C.sage }}>
                    Admin note: {report.adminNote}
                  </div>
                )}
              </div>
              {status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <textarea
                    placeholder="Admin note (optional)"
                    value={notes[report.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [report.id]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, resize: "vertical", minHeight: 55, fontFamily: "inherit", fontSize: 11, color: C.ink }}
                  />
                  <Btn variant="sage" disabled={busy[report.id]} onClick={() => update(report.id, "investigating")}>Investigate</Btn>
                  <Btn variant="ghost" disabled={busy[report.id]} onClick={() => update(report.id, "dismissed")}>Dismiss</Btn>
                </div>
              )}
              {status === "investigating" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <textarea
                    placeholder="Resolution note"
                    value={notes[report.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [report.id]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, resize: "vertical", minHeight: 55, fontFamily: "inherit", fontSize: 11, color: C.ink }}
                  />
                  <Btn variant="sage" disabled={busy[report.id]} onClick={() => update(report.id, "resolved")}>Mark Resolved</Btn>
                  <Btn variant="ghost" disabled={busy[report.id]} onClick={() => update(report.id, "dismissed")}>Dismiss</Btn>
                </div>
              )}
            </div>
          </Card>
        ))
      }
    </section>
  );
}

// ─── points / redemptions section ────────────────────────────────────────────

function Points({ toast }) {
  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [notes, setNotes] = useState({});
  const [awardUserId, setAwardUserId] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [awardDesc, setAwardDesc] = useState("");
  const [awardBusy, setAwardBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRequests(await get(`/admin/points/redemptions?status=${status}`)); }
    catch { setRequests([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const decide = async (id, decision) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await patch(`/admin/points/redemptions/${id}`, { decision, adminNote: notes[id] || "" });
      toast(`Redemption ${decision}`);
      await load();
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const award = async (e) => {
    e.preventDefault();
    const userId = Number.parseInt(awardUserId, 10);
    const amount = Number.parseInt(awardAmount, 10);
    if (!userId || !amount || !awardDesc.trim()) return toast("Fill in all award fields");
    setAwardBusy(true);
    try {
      const result = await api("POST", "/admin/points/award", { userId, amount, description: awardDesc });
      toast(`Awarded ${amount} pts. New balance: ${result.newBalance}`);
      setAwardUserId(""); setAwardAmount(""); setAwardDesc("");
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setAwardBusy(false);
    }
  };

  const statusColor = { pending: C.amber, approved: C.sage, rejected: C.sos };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20 }}>Points & Redemptions</h2>

      {/* Manual award form */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 14, fontSize: 14 }}>Manually Award Points</div>
        <form onSubmit={award} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 120px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.soft, marginBottom: 5 }}>USER ID</div>
            <Input value={awardUserId} onChange={setAwardUserId} placeholder="e.g. 3" type="number" />
          </div>
          <div style={{ flex: "0 0 110px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.soft, marginBottom: 5 }}>POINTS</div>
            <Input value={awardAmount} onChange={setAwardAmount} placeholder="e.g. 20" type="number" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.soft, marginBottom: 5 }}>REASON</div>
            <Input value={awardDesc} onChange={setAwardDesc} placeholder="e.g. Event participation" />
          </div>
          <Btn variant="sage" disabled={awardBusy} style={{ whiteSpace: "nowrap" }}>
            {awardBusy ? "Awarding…" : "Award Points"}
          </Btn>
        </form>
      </Card>

      {/* Redemption requests */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Redemption Requests</div>
        <Select value={status} onChange={setStatus} style={{ marginLeft: "auto" }}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {loading ? <div style={{ color: C.soft }}>Loading…</div> :
        requests.length === 0 ? <Card><div style={{ color: C.soft, textAlign: "center" }}>No {status} redemption requests</div></Card> :
        requests.map((req) => (
          <Card key={req.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900 }}>{req.name}</span>
                  <Badge color={statusColor[req.status] || C.soft}>{req.status}</Badge>
                  <Badge color={C.amber}>{req.pointsAmount} pts</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.soft, marginTop: 3 }}>{req.email} · Balance: {req.pointsBalance} pts</div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>{req.rewardDescription}</div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 4 }}>
                  Requested: {new Date(req.createdAt).toLocaleString()}
                </div>
                {req.adminNote && (
                  <div style={{ marginTop: 6, fontSize: 11, background: C.sageSoft, padding: "6px 10px", borderRadius: 8, color: C.sage }}>
                    Admin note: {req.adminNote}
                  </div>
                )}
              </div>
              {status === "pending" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <textarea
                    placeholder="Admin note (optional)"
                    value={notes[req.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, resize: "vertical", minHeight: 55, fontFamily: "inherit", fontSize: 11, color: C.ink }}
                  />
                  <Btn variant="sage" disabled={busy[req.id]} onClick={() => decide(req.id, "approved")}>✓ Approve</Btn>
                  <Btn variant="danger" disabled={busy[req.id]} onClick={() => decide(req.id, "rejected")}>✗ Reject</Btn>
                </div>
              )}
            </div>
          </Card>
        ))
      }
    </section>
  );
}

// ─── nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "applications", label: "🏢 Applications" },
  { id: "users", label: "👥 Users" },
  { id: "rescue", label: "🆘 Rescue Reports" },
  { id: "cruelty", label: "🚨 Cruelty Reports" },
  { id: "points", label: "⭐ Points" },
];

// ─── main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("applications");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    get("/me").then((data) => {
      if (data.user.role === "admin") setUser(data.user);
      else localStorage.removeItem(TOKEN_KEY);
    }).catch(() => localStorage.removeItem(TOKEN_KEY));
  }, []);

  const showToast = (message) => setToast(message);

  if (!user) return (
    <>
      <style>{STYLE}</style>
      <LoginScreen onLogin={setUser} />
    </>
  );

  return (
    <>
      <style>{STYLE}</style>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: C.surface, borderRight: `1.5px solid ${C.line}`, padding: "24px 0", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🐾</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>PawPin</div>
                <div style={{ color: C.soft, fontSize: 10 }}>Admin Panel</div>
              </div>
            </div>
          </div>
          <nav style={{ padding: "16px 12px", flex: 1 }}>
            {NAV_ITEMS.map(({ id, label }) => (
              <button key={id} onClick={() => setSection(id)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, marginBottom: 4,
                background: section === id ? C.amberSoft : "transparent",
                color: section === id ? C.amber : C.ink, cursor: "pointer",
              }}>
                {label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: C.soft, marginBottom: 12 }}>{user.email}</div>
            <Btn variant="ghost" style={{ width: "100%", fontSize: 11 }} onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              setUser(null);
            }}>
              Sign out
            </Btn>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {section === "applications" && <Applications toast={showToast} />}
          {section === "users" && <Users toast={showToast} />}
          {section === "rescue" && <RescueReports toast={showToast} />}
          {section === "cruelty" && <CrueltyReports toast={showToast} />}
          {section === "points" && <Points toast={showToast} />}
        </div>
      </div>
    </>
  );
}
