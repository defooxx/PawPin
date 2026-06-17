import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Check, Eye, EyeOff, FileCheck2, KeyRound, LogOut, MailCheck, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
  getApplications,
  googleLogin,
  login,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  reviewApplication,
  submitApplication,
  updateProfile,
  uploadApplicationDocument,
  uploadProfilePhoto,
  verifyEmail,
} from "../services/auth.js";
import { fade } from "../data.js";

function Field({ label, ...props }) {
  return <label className="pp-field"><span>{label}</span><input {...props} /></label>;
}

const nepalPlaces = [
  "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Bharatpur", "Biratnagar", "Birgunj", "Dharan", "Butwal", "Hetauda",
  "Janakpur", "Nepalgunj", "Dhangadhi", "Itahari", "Tulsipur", "Ghorahi", "Damak", "Birtamod", "Mechinagar", "Kirtipur",
  "Madhyapur Thimi", "Banepa", "Dhulikhel", "Panauti", "Bidur", "Dhulabari", "Rajbiraj", "Lahan", "Siraha", "Jaleshwar",
  "Kalaiya", "Gaur", "Malangwa", "Sindhuli", "Ramechhap", "Charikot", "Chautara", "Dhunche", "Besisahar", "Gorkha",
  "Damauli", "Waling", "Baglung", "Beni", "Kusma", "Tansen", "Tamghas", "Sandhikharka", "Taulihawa", "Lumbini",
  "Siddharthanagar", "Lamahi", "Kohalpur", "Gulariya", "Tikapur", "Mahendranagar", "Dadeldhura", "Dipayal", "Silgadhi",
  "Dasharathchand", "Chainpur", "Martadi", "Mangalsen", "Jumla", "Khalanga", "Dunai", "Simikot", "Manang", "Mustang",
  "Taplejung", "Phidim", "Ilam", "Dhankuta", "Terhathum", "Sankhuwasabha", "Bhojpur", "Khotang", "Okhaldhunga", "Solukhumbu",
  "Udayapur", "Gaighat", "Inaruwa", "Urlabari", "Letang", "Godawari", "Tokha", "Budhanilkantha", "Chandragiri", "Tarakeshwar",
];

function SelectField({ label, children, ...props }) {
  return <label className="pp-field"><span>{label}</span><select {...props}>{children}</select></label>;
}

function PasswordField({ label, value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="pp-field">
      <span>{label}</span>
      <span className="pp-password-wrap">
        <input {...props} type={visible ? "text" : "password"} value={value} onChange={onChange} />
        <button type="button" className="pp-eye-btn" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

function AuthForm({ onAuthenticated, onDone, toast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", location: "", accountType: "user",
    acceptTerms: false, acceptPrivacy: false, locationConsent: "ask", token: "",
  });
  const [loading, setLoading] = useState(false);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const check = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.checked }));
  const passwordChecks = [
    ["10+ characters", form.password.length >= 10],
    ["A letter", /[A-Za-z]/.test(form.password)],
    ["A number", /\d/.test(form.password)],
    ["Passwords match", Boolean(form.password) && form.password === form.confirmPassword],
  ];
  const finishAuth = (user) => {
    onAuthenticated(user);
    onDone();
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "verify") {
        const session = await verifyEmail(form.token);
        finishAuth(session.user);
        toast("Email verified. Welcome to PawPin.");
      } else if (mode === "forgot") {
        const result = await requestPasswordReset(form.email);
        setForm((current) => ({ ...current, token: result.developmentResetToken || "" }));
        setMode("reset");
        toast(result.message);
      } else if (mode === "reset") {
        await resetPassword({ token: form.token, password: form.password, confirmPassword: form.confirmPassword });
        setMode("login");
        toast("Password updated. Sign in with your new password.");
      } else {
        const session = mode === "login" ? await login(form) : await register(form);
        finishAuth(session.user);
        if (mode === "register" && session.verificationRequired) {
          setForm((current) => ({ ...current, token: session.developmentVerificationToken || "" }));
          toast(session.verificationEmailSent ? "Account created. Check your email to verify when you can." : "Account created. You can verify your email from your profile.");
        } else {
          toast(`Welcome${session.user.name ? `, ${session.user.name}` : ""}`);
        }
      }
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleLogin = async (credential) => {
    try {
      const session = await googleLogin(credential);
      finishAuth(session.user);
      toast(`Welcome, ${session.user.name}`);
    } catch (error) {
      toast(error.message);
    }
  };

  const resend = async () => {
    setLoading(true);
    try {
      const result = await resendVerification(form.email);
      setForm((current) => ({ ...current, token: result.developmentVerificationToken || current.token }));
      toast(result.message);
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "verify") {
    return (
      <form onSubmit={submit} style={fade}>
        <div className="pp-account-hero"><MailCheck size={34} color="var(--sage)" /><h1 className="pp-h1">Verify your email</h1><p className="pp-sub">We emailed a one-time token to {form.email}. Paste it here to finish verification.</p></div>
        <Field label="Verification token" value={form.token} onChange={change("token")} required />
        <button className="pp-btn pp-btn-amber" disabled={loading}>Verify email</button>
        <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={resend} disabled={loading}>Send a new token</button>
      </form>
    );
  }

  if (mode === "forgot" || mode === "reset") {
    return (
      <form onSubmit={submit} style={fade}>
        <div className="pp-account-hero"><KeyRound size={34} color="var(--amber-deep)" /><h1 className="pp-h1">{mode === "forgot" ? "Reset your password" : "Choose a new password"}</h1></div>
        {mode === "forgot" ? <Field label="Email" type="email" value={form.email} onChange={change("email")} required /> : <>
          <Field label="Reset token" value={form.token} onChange={change("token")} required />
          <PasswordField label="New password" value={form.password} onChange={change("password")} required />
          <PasswordField label="Confirm password" value={form.confirmPassword} onChange={change("confirmPassword")} required />
        </>}
        <button className="pp-btn pp-btn-amber" disabled={loading}>{mode === "forgot" ? "Continue" : "Update password"}</button>
        <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={() => setMode("login")}>Back to sign in</button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={fade}>
      <div className="pp-account-hero">
        <UserRound size={30} />
        <h1 className="pp-h1">{mode === "login" ? "Welcome back" : "Join PawPin"}</h1>
        <p className="pp-sub">{mode === "login" ? "Sign in to see your reports and profile." : "Create a profile to build your rescue history."}</p>
      </div>
      {mode === "register" && <>
        <p className="pp-field">I am joining as</p>
        <div className="pp-role-grid">
          {[["user", UserRound, "Individual"], ["shelter", Building2, "Shelter"], ["vet", Stethoscope, "Veterinarian"]].map(([type, Icon, label]) => (
            <button type="button" key={type} className={"pp-role-choice" + (form.accountType === type ? " on" : "")} onClick={() => setForm((current) => ({ ...current, accountType: type }))}><Icon size={18} />{label}</button>
          ))}
        </div>
        <Field label="Name" value={form.name} onChange={change("name")} required />
      </>}
      <Field label="Email" type="email" value={form.email} onChange={change("email")} required />
      <PasswordField label="Password" value={form.password} onChange={change("password")} minLength={10} required />
      {mode === "register" && <>
        <PasswordField label="Confirm password" value={form.confirmPassword} onChange={change("confirmPassword")} required />
        <div className="pp-password-checks">{passwordChecks.map(([label, valid]) => <span className={valid ? "ok" : ""} key={label}><Check size={12} />{label}</span>)}</div>
        <SelectField label="City or place in Nepal" value={form.location} onChange={change("location")}>
          <option value="">Choose a city or place</option>
          {nepalPlaces.map((place) => <option key={place} value={place}>{place}</option>)}
        </SelectField>
        <SelectField label="Location preference" value={form.locationConsent} onChange={change("locationConsent")}><option value="ask">Ask every time</option><option value="once">Allow once when requested</option><option value="while_using">Allow while using PawPin</option></SelectField>
        <label className="pp-check"><input type="checkbox" checked={form.acceptTerms} onChange={check("acceptTerms")} /> I accept the Terms of Service.</label>
        <label className="pp-check"><input type="checkbox" checked={form.acceptPrivacy} onChange={check("acceptPrivacy")} /> I accept the Privacy Policy and understand location is only used with permission.</label>
      </>}
      <button className="pp-btn pp-btn-amber" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
      {mode === "login" && <button type="button" className="pp-link" style={{ width: "100%", marginTop: 12 }} onClick={() => setMode("forgot")}>Forgot password?</button>}
      <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
      </button>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID
        ? <div style={{ display: "grid", placeItems: "center", marginTop: 12 }}><GoogleLogin onSuccess={(response) => finishGoogleLogin(response.credential)} onError={() => toast("Google sign-in failed")} /><p className="pp-sub" style={{ fontSize: 10.5, textAlign: "center" }}>By continuing with Google, you accept PawPin's Terms and Privacy Policy. Location remains ask-first.</p></div>
        : <p className="pp-sub" style={{ fontSize: 11.5, textAlign: "center", marginTop: 12 }}>Google sign-in becomes available when its client ID is configured.</p>}
    </form>
  );
}

function ApplicationForm({ refresh, toast, defaultType = "shelter" }) {
  const [form, setForm] = useState({ type: defaultType === "vet" ? "vet" : "shelter", organizationName: "", registrationNumber: "", address: "", documentUrls: [] });
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

function VerificationNotice({ email, refresh, toast }) {
  const [loading, setLoading] = useState(false);
  const resend = async () => {
    setLoading(true);
    try {
      const result = await resendVerification(email);
      toast(result.message);
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pp-notice">
      <MailCheck size={19} />
      <div style={{ flex: 1 }}>
        <b>Verify your email</b>
        <p className="pp-sub">We sent a verification email to {email}. Open it and use the token there to finish verification.</p>
        <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
          <button className="pp-link" onClick={resend} disabled={loading}>{loading ? "Sending..." : "Resend email"}</button>
          <button className="pp-link" onClick={refresh} disabled={loading}>I verified it</button>
        </div>
      </div>
    </div>
  );
}

export function AccountScreen({ data, onBack, onAuthenticated, onLogout, refresh, toast }) {
  const [profile, setProfile] = useState(data?.user || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  useEffect(() => setProfile(data?.user || null), [data]);

  if (!profile) return <div><button className="pp-icobtn" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><AuthForm onAuthenticated={onAuthenticated} onDone={onBack} toast={toast} /></div>;

  const save = async (event) => {
    event.preventDefault();
    try {
      await updateProfile({ name: profile.name, location: profile.location || "" });
      toast("Profile saved. Your changes are up to date.");
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadProfilePhoto(dataUrl);
      setProfile(result.user);
      toast("Profile photo uploaded.");
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
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
      {!profile.emailVerified && <VerificationNotice email={profile.email} refresh={refresh} toast={toast} />}
      <form onSubmit={save}>
        <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
        <Field label="Location" value={profile.location || ""} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
        <label className="pp-upload">
          <UserRound size={18} /> {photoUploading ? "Uploading profile photo..." : profile.photoUrl ? "Change profile photo" : "Upload profile photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={photoUploading} onChange={uploadPhoto} />
        </label>
        <button className="pp-btn pp-btn-amber">Save profile</button>
      </form>

      <h2 className="pp-h2" style={{ marginTop: 20 }}>Report history</h2>
      {!data.reports.length && <p className="pp-sub">Your signed-in rescue reports will appear here.</p>}
      {data.reports.map((report) => <div className="pp-listcard" style={{ marginTop: 8 }} key={report.id}><div style={{ flex: 1 }}><b>Report #{report.id}</b><div className="pp-sub">{report.tags.join(", ")}</div></div><span className="pp-pill" style={{ background: "var(--bg)" }}>{report.status}</span></div>)}

      {data.application
        ? <div className="pp-card" style={{ marginTop: 18 }}><b>{data.application.organizationName}</b><p className="pp-sub">Application status: {data.application.status}</p></div>
        : profile.role === "user" && profile.emailVerified && ["shelter", "vet"].includes(profile.accountType) && <div style={{ marginTop: 18 }}><ApplicationForm refresh={refresh} toast={toast} defaultType={profile.accountType} /></div>}
      {profile.role === "admin" && <AdminPanel toast={toast} />}
    </div>
  );
}
