import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Building2, Check, FileCheck2, LogOut, Phone,
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
  const [form, setForm] = useState({ name: user.name || "", location: user.location || "" });
  const [loading, setLoading] = useState(false);
  const change = (key) => (event) => setForm((cur) => ({ ...cur, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.location) return toast("Please enter your name and choose a city.");
    setLoading(true);
    try {
      const result = await updateProfile({ name: form.name.trim(), location: form.location });
      onDone(result.user);
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={fade}>
      <div className="pp-account-hero">
        <div style={{ fontSize: 36 }}>🐾</div>
        <h1 className="pp-h1">Almost there!</h1>
        <p className="pp-sub">Tell us a little about yourself so we can show you the right animals near you.</p>
      </div>
      <Field label="Your name" value={form.name} onChange={change("name")} placeholder="e.g. Priya Sharma" required />
      <SelectField label="Your city in Nepal" value={form.location} onChange={change("location")} required>
        <option value="">Choose a city or place</option>
        {nepalPlaces.map((place) => <option key={place} value={place}>{place}</option>)}
      </SelectField>
      <button className="pp-btn pp-btn-amber" disabled={loading || !form.name.trim() || !form.location}>
        {loading ? "Saving..." : "Save and continue"}
      </button>
    </form>
  );
}

// Phone OTP flow — onAuthenticated(user, isNewUser) called when OTP confirmed
function PhoneAuthFlow({ onAuthenticated, toast }) {
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
    return (
      <form onSubmit={verifyOtp} style={fade}>
        <div className="pp-account-hero">
          <Phone size={34} color="var(--sage)" />
          <h1 className="pp-h1">Enter the OTP</h1>
          <p className="pp-sub">We sent a 6-digit code to your phone. Enter it below.</p>
        </div>
        <Field
          label="6-digit OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
        />
        <button className="pp-btn pp-btn-amber" disabled={loading || otp.length < 6}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
        <button type="button" className="pp-btn pp-btn-ghost" style={{ marginTop: 9 }} onClick={() => { setStep("phone"); setOtp(""); }}>
          Change number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} style={fade}>
      <div className="pp-account-hero">
        <Phone size={34} color="var(--sage)" />
        <h1 className="pp-h1">Sign in with phone</h1>
        <p className="pp-sub">We'll send a one-time code to your Nepal number via SMS.</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <label className="pp-field" style={{ flex: "0 0 auto" }}>
          <span>Country</span>
          <input value="+977 🇳🇵" readOnly style={{ width: 90 }} />
        </label>
        <label className="pp-field" style={{ flex: 1 }}>
          <span>Phone number</span>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneLocal}
            onChange={(event) => setPhoneLocal(event.target.value.replace(/[^\d\s\-]/g, ""))}
            placeholder="98xxxxxxxx"
            required
          />
        </label>
      </div>
      <div id="recaptcha-container" />
      <button className="pp-btn pp-btn-amber" disabled={loading}>
        {loading ? "Sending OTP..." : "Send OTP"}
      </button>
    </form>
  );
}

// Landing — choose Google or Phone
// onAuthenticated(user, isNewUser) — caller decides whether to navigate or show profile setup
function AuthLanding({ onAuthenticated, toast }) {
  const [mode, setMode] = useState("landing"); // landing | phone
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
        <PhoneAuthFlow onAuthenticated={onAuthenticated} toast={toast} />
      </div>
    );
  }

  return (
    <div style={{ ...fade, textAlign: "center" }}>
      <div className="pp-account-hero">
        <div style={{ fontSize: 48 }}>🐾</div>
        <h1 className="pp-h1">Welcome to PawPin</h1>
        <p className="pp-sub">Nepal's animal rescue community. Sign in to track your reports, find shelters, and help animals near you.</p>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {googleClientId
          ? <div style={{ display: "grid", placeItems: "center" }}>
              <GoogleLogin
                onSuccess={(response) => finishGoogleLogin(response.credential)}
                onError={() => toast("Google sign-in failed")}
                width="280"
              />
            </div>
          : <p className="pp-sub" style={{ fontSize: 12 }}>Google sign-in needs VITE_GOOGLE_CLIENT_ID in Vercel.</p>}

        {googleClientId && isFirebaseConfigured && <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>}

        <button className="pp-btn pp-btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setMode("phone")} disabled={!isFirebaseConfigured}>
          <Phone size={17} />
          {isFirebaseConfigured ? "Sign in with phone number" : "Phone sign-in needs Firebase env vars"}
        </button>
      </div>

      <p className="pp-sub" style={{ fontSize: 11, marginTop: 20 }}>
        By signing in you accept PawPin's Terms of Service and Privacy Policy. Your location is only used with your permission.
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
      <div>
        <button className="pp-icobtn" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button>
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
