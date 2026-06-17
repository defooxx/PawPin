import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Building2, Check, ChevronRight, FileCheck2, LogOut, Phone,
  ShieldCheck, Stethoscope, UserRound,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import {
  getApplications,
  googleLogin,
  firebasePhoneLogin,
  reviewApplication,
  submitApplication,
  updateProfile,
  uploadApplicationDocument,
  uploadProfilePhoto,
} from "../services/auth.js";
import { auth, isFirebaseConfigured, RecaptchaVerifier, signInWithPhoneNumber } from "../services/firebase.js";
import { fade } from "../data.js";

function Field({ label, ...props }) {
  return <label className="pp-field"><span>{label}</span><input {...props} /></label>;
}

function SelectField({ label, children, ...props }) {
  return <label className="pp-field"><span>{label}</span><select {...props}>{children}</select></label>;
}

function AuthIcon({ children, tone = "amber" }) {
  return <div className={`pp-auth-icon ${tone}`}>{children}</div>;
}

function maskPhone(number) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "+977 98xxxxxxxx";
  const local = digits.replace(/^977/, "");
  return `+977 ${local.slice(0, 2)}${"x".repeat(Math.max(0, local.length - 2))}`;
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

// Profile setup — shown after first Google or phone sign-in when name/location is missing
function ProfileSetup({ user, onDone, toast }) {
  const [form, setForm] = useState({ name: user.name || "", location: user.location || "", accountType: user.accountType || "user" });
  const [loading, setLoading] = useState(false);
  const change = (key) => (event) => setForm((cur) => ({ ...cur, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.location) return toast("Please enter your name and choose a city.");
    setLoading(true);
    try {
      const result = await updateProfile({ name: form.name.trim(), location: form.location, accountType: form.accountType });
      onDone(result.user);
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="pp-auth-flow" onSubmit={submit} style={fade}>
      <div className="pp-auth-head">
        <AuthIcon tone="sage">🎉</AuthIcon>
        <h1 className="pp-auth-title">One last thing</h1>
        <p className="pp-auth-sub">Tell us about yourself — takes 10 seconds.</p>
      </div>
      <Field label="Your name" value={form.name} onChange={change("name")} placeholder="e.g. Priya Sharma" required />
      <SelectField label="Your city in Nepal" value={form.location} onChange={change("location")} required>
        <option value="">Choose a city or place</option>
        {nepalPlaces.map((place) => <option key={place} value={place}>{place}</option>)}
      </SelectField>
      <p className="pp-field" style={{ marginBottom: 8 }}>I am joining as</p>
      <div className="pp-role-grid pp-auth-roles">
        {[["user", UserRound, "Individual"], ["shelter", Building2, "Shelter"], ["vet", Stethoscope, "Vet"]].map(([type, Icon, label]) => (
          <button type="button" key={type} className={"pp-role-choice" + (form.accountType === type ? " on" : "")} onClick={() => setForm((current) => ({ ...current, accountType: type }))}>
            <Icon size={18} />{label}
          </button>
        ))}
      </div>
      <button className="pp-btn pp-btn-amber" disabled={loading || !form.name.trim() || !form.location}>
        {loading ? "Saving..." : "Let's go 🐾"}
      </button>
    </form>
  );
}

// Phone OTP flow — onAuthenticated(user, isNewUser) called when OTP confirmed
function PhoneAuthFlow({ onAuthenticated, onBack, toast }) {
  const [step, setStep] = useState("phone"); // phone | otp
  const [phoneLocal, setPhoneLocal] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Render invisible reCAPTCHA
  useEffect(() => {
    if (!auth) return undefined;
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
    return () => {
      try { recaptchaRef.current?.clear(); } catch { /* ignore */ }
      recaptchaRef.current = null;
    };
  }, []);

  const sendOtp = async (event) => {
    event.preventDefault();
    if (!auth || !recaptchaRef.current) return toast("Phone sign-in is not configured yet.");
    const digits = phoneLocal.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 10) return toast("Enter a valid Nepal phone number (9 or 10 digits).");
    const fullNumber = `+977${digits.replace(/^977/, "")}`;
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, fullNumber, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setStep("otp");
      toast("OTP sent to " + fullNumber);
    } catch (error) {
      console.error("Send OTP error:", error);
      toast(error.message?.includes("too-many-requests") ? "Too many attempts. Please wait and try again." : "Could not send OTP. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!otp.trim() || otp.length < 6) return toast("Enter the 6-digit OTP.");
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp.trim());
      const idToken = await result.user.getIdToken();
      const session = await firebasePhoneLogin(idToken);
      onAuthenticated(session.user, session.isNewUser);
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast(error.message?.includes("invalid-verification-code") ? "Incorrect OTP. Please try again." : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    const otpDigits = otp.padEnd(6, " ").slice(0, 6).split("");
    return (
      <form className="pp-auth-flow" onSubmit={verifyOtp} style={fade}>
        <div className="pp-auth-head">
          <AuthIcon tone="sage">✉️</AuthIcon>
          <h1 className="pp-auth-title">Check your SMS</h1>
          <p className="pp-auth-sub">6-digit code sent to<br />{maskPhone(phoneLocal)}</p>
        </div>
        <label className="pp-otp-wrap">
          <span className="pp-sr-only">6-digit OTP</span>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            aria-label="6-digit OTP"
          />
          <span className="pp-otp-boxes" aria-hidden="true">
            {otpDigits.map((digit, index) => <span className={digit.trim() ? "filled" : ""} key={index}>{digit.trim() || "—"}</span>)}
          </span>
        </label>
        <button className="pp-btn pp-btn-amber" disabled={loading || otp.length < 6}>
          {loading ? "Verifying..." : "Verify →"}
        </button>
        <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} disabled>
          Resend in 0:45
        </button>
        <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={() => { setStep("phone"); setOtp(""); }}>
          ← Wrong number?
        </button>
      </form>
    );
  }

  return (
    <form className="pp-auth-flow" onSubmit={sendOtp} style={fade}>
      <div className="pp-auth-head">
        <AuthIcon>📱</AuthIcon>
        <h1 className="pp-auth-title">Your number</h1>
        <p className="pp-auth-sub">We'll text a one-time code. Works with NTC and Ncell.</p>
      </div>
      <label className="pp-phone-entry">
        <span>Nepal mobile number</span>
        <div className="pp-phone-input">
          <strong>🇳🇵 +977</strong>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneLocal}
            onChange={(event) => setPhoneLocal(event.target.value.replace(/[^\d\s\-]/g, ""))}
            placeholder="98xxxxxxxx"
            required
          />
        </div>
      </label>
      <div className="pp-auth-note">🔒 A verified Nepal number is required to alert shelters — keeps fake reports out.</div>
      <div id="recaptcha-container" />
      <button className="pp-btn pp-btn-amber" disabled={loading}>
        {loading ? "Sending OTP..." : "Send code →"}
      </button>
      <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={onBack}>← Back</button>
    </form>
  );
}

// Landing — choose Google or Phone
// onAuthenticated(user, isNewUser) — caller decides whether to navigate or show profile setup
function AuthLanding({ onAuthenticated, toast }) {
  const [mode, setMode] = useState("landing"); // landing | phone
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const missingGoogle = () => toast("Google sign-in is not configured yet.");
  const startPhone = () => {
    if (!isFirebaseConfigured) return toast("Phone sign-in is not configured yet.");
    setMode("phone");
  };

  const finishGoogleLogin = async (credential) => {
    try {
      const session = await googleLogin(credential);
      onAuthenticated(session.user, session.isNewUser);
    } catch (error) {
      toast(error.message);
    }
  };

  if (mode === "phone") {
    return (
      <div style={fade}>
        <button className="pp-icobtn" style={{ marginBottom: 8 }} onClick={() => setMode("landing")} aria-label="Back"><ArrowLeft size={18} /></button>
        <PhoneAuthFlow onAuthenticated={onAuthenticated} onBack={() => setMode("landing")} toast={toast} />
      </div>
    );
  }

  return (
    <div className="pp-auth-flow" style={fade}>
      <div className="pp-auth-head">
        <AuthIcon>🐾</AuthIcon>
        <h1 className="pp-auth-title">PawPin</h1>
        <p className="pp-auth-sub">Rescue. Report. Reunite.<br />Nepal's animal welfare community.</p>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <button type="button" className="pp-auth-choice google" onClick={googleClientId ? undefined : missingGoogle}>
          <div className="pp-auth-choice-icon">G</div>
          <div>
            <b>Continue with Google</b>
            <span>Quick sign in with your Google account</span>
          </div>
          <ChevronRight size={20} />
          {googleClientId && <div className="pp-google-hitarea">
            <GoogleLogin
              onSuccess={(response) => finishGoogleLogin(response.credential)}
              onError={() => toast("Google sign-in failed")}
              width="320"
            />
          </div>}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <button type="button" className="pp-auth-choice" onClick={startPhone}>
          <div className="pp-auth-choice-icon phone">📱</div>
          <div>
            <b>Use Nepal phone number</b>
            <span>NTC · Ncell · OTP via SMS</span>
          </div>
          <ChevronRight size={20} />
        </button>

        {(!googleClientId || !isFirebaseConfigured) && <div className="pp-auth-config-note">
          {!googleClientId && <span>Google needs its Vercel client ID.</span>}
          {!isFirebaseConfigured && <span>Phone OTP needs Firebase env vars.</span>}
        </div>}
      </div>

      <p className="pp-auth-foot">
        No password needed. Ever.
      </p>
    </div>
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

export function AccountScreen({ data, onBack, onAuthenticated, onLogout, refresh, toast }) {
  const [profile, setProfile] = useState(data?.user || null);
  const [pendingNewUser, setPendingNewUser] = useState(null); // user object awaiting profile setup
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    // Only update profile from data if not in the middle of profile setup
    if (!pendingNewUser) setProfile(data?.user || null);
  }, [data, pendingNewUser]);

  // Called after sign-in — decide whether to go home or show profile setup
  const handleAuthenticated = (user, isNewUser) => {
    onAuthenticated(user);
    if (isNewUser || !user.location || user.name === user.phoneNumber) {
      setPendingNewUser(user);
    } else {
      onBack(); // go home
      toast(`Welcome back, ${user.name} 🐾`);
    }
  };

  const finishProfileSetup = (updatedUser) => {
    setPendingNewUser(null);
    onAuthenticated(updatedUser);
    refresh();
    onBack(); // go home after profile setup
    toast(`Welcome to PawPin, ${updatedUser.name}! 🐾`);
  };

  // Show profile setup for new users
  if (pendingNewUser) {
    return (
      <div>
        <ProfileSetup user={pendingNewUser} onDone={finishProfileSetup} toast={toast} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pp-auth-screen">
        <button className="pp-icobtn pp-auth-back" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="pp-build-pill">auth redesign live</div>
        <AuthLanding onAuthenticated={handleAuthenticated} toast={toast} />
      </div>
    );
  }

  const save = async (event) => {
    event.preventDefault();
    try {
      await updateProfile({ name: profile.name, location: profile.location || "" });
      toast("Profile saved.");
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
      toast("Profile photo updated.");
      await refresh();
    } catch (error) {
      toast(error.message);
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  };

  const contactInfo = profile.email || (profile.phoneNumber ? `📱 ${profile.phoneNumber}` : null);

  return (
    <div style={fade}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="pp-icobtn" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button>
        <button className="pp-link" onClick={onLogout}><LogOut size={15} style={{ verticalAlign: "-3px" }} /> Sign out</button>
      </div>
      <div className="pp-account-hero">
        <div className="pp-avatar">{profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : <UserRound size={30} />}</div>
        <h1 className="pp-h1">{profile.name}</h1>
        {contactInfo && <p className="pp-sub" style={{ fontSize: 12 }}>{contactInfo}</p>}
        <span className="pp-pill" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}><ShieldCheck size={13} />{profile.role}</span>
      </div>

      <form onSubmit={save}>
        <Field label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
        <SelectField label="City or place in Nepal" value={profile.location || ""} onChange={(event) => setProfile({ ...profile, location: event.target.value })}>
          <option value="">Choose a city or place</option>
          {nepalPlaces.map((place) => <option key={place} value={place}>{place}</option>)}
        </SelectField>
        <label className="pp-upload">
          <UserRound size={18} /> {photoUploading ? "Uploading..." : profile.photoUrl ? "Change profile photo" : "Upload profile photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={photoUploading} onChange={uploadPhoto} />
        </label>
        <button className="pp-btn pp-btn-amber">Save profile</button>
      </form>

      <h2 className="pp-h2" style={{ marginTop: 20 }}>Report history</h2>
      {!data?.reports?.length && <p className="pp-sub">Your signed-in rescue reports will appear here.</p>}
      {data?.reports?.map((report) => (
        <div className="pp-listcard" style={{ marginTop: 8 }} key={report.id}>
          <div style={{ flex: 1 }}><b>Report #{report.id}</b><div className="pp-sub">{report.tags.join(", ")}</div></div>
          <span className="pp-pill" style={{ background: "var(--bg)" }}>{report.status}</span>
        </div>
      ))}

      {data?.application
        ? <div className="pp-card" style={{ marginTop: 18 }}><b>{data.application.organizationName}</b><p className="pp-sub">Application status: {data.application.status}</p></div>
        : profile.role === "user" && ["shelter", "vet"].includes(profile.accountType) && <div style={{ marginTop: 18 }}><ApplicationForm refresh={refresh} toast={toast} defaultType={profile.accountType} /></div>}
      {profile.role === "admin" && <AdminPanel toast={toast} />}
    </div>
  );
}
