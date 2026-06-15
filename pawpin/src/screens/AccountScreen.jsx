import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Check, FileCheck2, LogOut, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
  getApplications,
  googleLogin,
  login,
  register,
  reviewApplication,
  submitApplication,
  updateProfile,
  uploadApplicationDocument,
} from "../services/auth.js";
import { fade } from "../data.js";

function Field({ label, ...props }) {
  return <label className="pp-field"><span>{label}</span><input {...props} /></label>;
}

function AuthForm({ onAuthenticated, toast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", location: "" });
  const [loading, setLoading] = useState(false);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const session = mode === "login" ? await login(form) : await register(form);
      onAuthenticated(session.user);
      toast(`Welcome${session.user.name ? `, ${session.user.name}` : ""}`);
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleLogin = async (credential) => {
    try {
      const session = await googleLogin(credential);
      onAuthenticated(session.user);
      toast(`Welcome, ${session.user.name}`);
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <form onSubmit={submit} style={fade}>
      <div className="pp-account-hero">
        <UserRound size={30} />
        <h1 className="pp-h1">{mode === "login" ? "Welcome back" : "Join PawPin"}</h1>
        <p className="pp-sub">{mode === "login" ? "Sign in to see your reports and profile." : "Create a profile to build your rescue history."}</p>
      </div>
      {mode === "register" && <Field label="Name" value={form.name} onChange={change("name")} required />}
      <Field label="Email" type="email" value={form.email} onChange={change("email")} required />
      <Field label="Password" type="password" value={form.password} onChange={change("password")} minLength={10} required />
      {mode === "register" && <Field label="Location" value={form.location} onChange={change("location")} placeholder="City or neighbourhood" />}
      <button className="pp-btn pp-btn-amber" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
      <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
      </button>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID
        ? <div style={{ display: "grid", placeItems: "center", marginTop: 12 }}><GoogleLogin onSuccess={(response) => finishGoogleLogin(response.credential)} onError={() => toast("Google sign-in failed")} /></div>
        : <p className="pp-sub" style={{ fontSize: 11.5, textAlign: "center", marginTop: 12 }}>Google sign-in becomes available when its client ID is configured.</p>}
    </form>
  );
}

function ApplicationForm({ refresh, toast }) {
  const [form, setForm] = useState({ type: "shelter", organizationName: "", registrationNumber: "", address: "", documentUrls: [] });
  const [loading, setLoading] = useState(false);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadApplicationDocument(dataUrl);
      setForm((current) => ({ ...current, documentUrls: [...current.documentUrls, result.url] }));
      toast("Verification document uploaded");
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await submitApplication(form);
      toast("Application sent for admin review");
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="pp-card" onSubmit={submit}>
      <h2 className="pp-h2">Register a shelter or vet</h2>
      <div className="pp-segment" style={{ margin: "12px 0" }}>
        {["shelter", "vet"].map((type) => <button type="button" key={type} className={"pp-seg" + (form.type === type ? " on" : "")} onClick={() => setForm((current) => ({ ...current, type }))}>{type}</button>)}
      </div>
      <Field label="Organization name" value={form.organizationName} onChange={change("organizationName")} required />
      <Field label="Registration number" value={form.registrationNumber} onChange={change("registrationNumber")} required />
      <Field label="Address" value={form.address} onChange={change("address")} required />
      <label className="pp-upload">
        <FileCheck2 size={18} /> {form.documentUrls.length ? `${form.documentUrls.length} document uploaded` : "Upload registration document"}
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={upload} />
      </label>
      <button className="pp-btn pp-btn-amber" disabled={loading || !form.documentUrls.length}>{loading ? "Please wait..." : "Submit for approval"}</button>
    </form>
  );
}

function AdminPanel({ toast }) {
  const [applications, setApplications] = useState([]);
  const load = async () => {
    try {
      setApplications(await getApplications());
    } catch (error) {
      toast(error.message);
    }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    try {
      await reviewApplication(id, decision);
      toast(`Application ${decision}`);
      await load();
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h2 className="pp-h2">Admin approvals</h2>
      {!applications.length && <p className="pp-sub">No applications waiting for review.</p>}
      {applications.map((application) => (
        <div className="pp-card" style={{ marginTop: 10 }} key={application.id}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {application.type === "shelter" ? <Building2 color="var(--sage)" /> : <Stethoscope color="var(--sky)" />}
            <div><b>{application.organizationName}</b><div className="pp-sub">{application.name} · {application.email}</div></div>
          </div>
          <p className="pp-sub">{application.address}<br />Registration: {application.registrationNumber}</p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
            {application.documentUrls.map((url, index) => <a className="pp-link" href={url} target="_blank" rel="noreferrer" key={url}>Document {index + 1}</a>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pp-btn pp-btn-amber" onClick={() => decide(application.id, "approved")}><Check size={16} />Approve</button>
            <button className="pp-btn pp-btn-ghost" onClick={() => decide(application.id, "rejected")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountScreen({ data, onBack, onAuthenticated, onLogout, refresh, toast }) {
  const [profile, setProfile] = useState(data?.user || null);
  useEffect(() => setProfile(data?.user || null), [data]);

  if (!profile) return <div><button className="pp-icobtn" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><AuthForm onAuthenticated={onAuthenticated} toast={toast} /></div>;

  const save = async (event) => {
    event.preventDefault();
    try {
      await updateProfile(profile);
      toast("Profile updated");
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div style={fade}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="pp-icobtn" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button>
        <button className="pp-link" onClick={onLogout}><LogOut size={15} style={{ verticalAlign: "-3px" }} /> Sign out</button>
      </div>
      <div className="pp-account-hero">
        <div className="pp-avatar">{profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : <UserRound size={30} />}</div>
        <h1 className="pp-h1">{profile.name}</h1>
        <span className="pp-pill" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}><ShieldCheck size={13} />{profile.role}</span>
      </div>
      <form onSubmit={save}>
        <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
        <Field label="Location" value={profile.location || ""} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
        <Field label="Photo URL" value={profile.photoUrl || ""} onChange={(event) => setProfile({ ...profile, photoUrl: event.target.value })} />
        <button className="pp-btn pp-btn-amber">Save profile</button>
      </form>

      <h2 className="pp-h2" style={{ marginTop: 20 }}>Report history</h2>
      {!data.reports.length && <p className="pp-sub">Your signed-in rescue reports will appear here.</p>}
      {data.reports.map((report) => <div className="pp-listcard" style={{ marginTop: 8 }} key={report.id}><div style={{ flex: 1 }}><b>Report #{report.id}</b><div className="pp-sub">{report.tags.join(", ")}</div></div><span className="pp-pill" style={{ background: "var(--bg)" }}>{report.status}</span></div>)}

      {data.application
        ? <div className="pp-card" style={{ marginTop: 18 }}><b>{data.application.organizationName}</b><p className="pp-sub">Application status: {data.application.status}</p></div>
        : profile.role === "user" && <div style={{ marginTop: 18 }}><ApplicationForm refresh={refresh} toast={toast} /></div>}
      {profile.role === "admin" && <AdminPanel toast={toast} />}
    </div>
  );
}
