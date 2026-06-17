export const APP_STYLES = String.raw`
@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap");

:root {
  --bg: #fff4ea;
  --surface: #fff;
  --ink: #3a2a22;
  --ink-soft: #8a776b;
  --amber: #f7a833;
  --amber-deep: #e0860c;
  --amber-soft: #ffeed2;
  --sage: #3f9b7e;
  --sage-soft: #e2f1eb;
  --coral: #ff7a59;
  --coral-soft: #ffe5dd;
  --sky: #5fa9da;
  --sky-soft: #e2f0fa;
  --sos: #e5462e;
  --sos-soft: #fbe0db;
  --line: #f0e1d2;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { min-height: 100%; margin: 0; }
body { min-width: 320px; }
button, input, textarea, select { font: inherit; }
button:disabled { cursor: not-allowed; }

.pp-root { color: var(--ink); font-family: "Nunito", system-ui, sans-serif; }
.pp-fred { font-family: "Fredoka", "Nunito", sans-serif; }
.pp-stage {
  align-items: center;
  background:
    radial-gradient(1200px 600px at 10% -10%, #ffe6cc 0%, transparent 55%),
    radial-gradient(900px 500px at 110% 10%, #ffe0d6 0%, transparent 50%),
    var(--bg);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 12px;
  width: 100%;
}
.pp-phone {
  background: var(--surface);
  border-radius: 42px;
  box-shadow: 0 30px 70px -20px rgba(58, 42, 34, .45), 0 0 0 10px #2a1d16, 0 0 0 12px #4a352a;
  display: flex;
  flex-direction: column;
  height: 812px;
  max-height: 94vh;
  max-width: 392px;
  overflow: hidden;
  position: relative;
  width: 100%;
}
.pp-header {
  align-items: center;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  padding: 16px 18px 12px;
  position: relative;
  z-index: 5;
}
.pp-brand { align-items: center; display: flex; gap: 9px; }
.pp-logo {
  background: var(--amber);
  border-radius: 13px;
  box-shadow: 0 6px 14px -4px rgba(224, 134, 12, .6);
  display: grid;
  height: 38px;
  place-items: center;
  width: 38px;
}
.pp-icobtn {
  background: var(--bg);
  border: none;
  border-radius: 13px;
  color: var(--ink);
  cursor: pointer;
  display: grid;
  height: 40px;
  place-items: center;
  position: relative;
  width: 40px;
}
.pp-scroll { flex: 1; overflow-x: hidden; overflow-y: auto; padding: 16px 16px 22px; }
.pp-scroll::-webkit-scrollbar { width: 0; }
.pp-phone-auth { background: linear-gradient(180deg, #fff 0%, #fffdfb 72%, #fff7ef 100%); }
.pp-auth-scroll { padding: 0; }
.pp-tabs {
  background: var(--surface);
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-around;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
}
.pp-tab {
  align-items: center;
  background: none;
  border: none;
  color: var(--ink-soft);
  cursor: pointer;
  display: flex;
  flex: 1;
  flex-direction: column;
  font-family: "Nunito";
  font-size: 10.5px;
  font-weight: 700;
  gap: 3px;
  padding: 6px 0;
  transition: color .15s;
}
.pp-tab .pp-pawwrap {
  align-items: center;
  border-radius: 11px;
  display: grid;
  height: 30px;
  place-items: center;
  transition: .18s;
  width: 34px;
}
.pp-tab.active { color: var(--amber-deep); }
.pp-tab.active .pp-pawwrap { background: var(--amber-soft); transform: translateY(-1px); }
.pp-card { background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 16px; }
.pp-h1 { font-family: "Fredoka"; font-size: 23px; font-weight: 600; letter-spacing: -.3px; line-height: 1.1; }
.pp-h2 { font-family: "Fredoka"; font-size: 17px; font-weight: 600; }
.pp-sub { color: var(--ink-soft); font-size: 13.5px; line-height: 1.45; }
.pp-link {
  background: none;
  border: none;
  color: var(--amber-deep);
  cursor: pointer;
  font-family: "Nunito";
  font-size: 13px;
  font-weight: 800;
}
.pp-sos {
  background: linear-gradient(135deg, #ff6b4a, var(--sos));
  border: none;
  border-radius: 24px;
  box-shadow: 0 16px 30px -12px rgba(229, 70, 46, .6);
  color: #fff;
  cursor: pointer;
  overflow: hidden;
  padding: 20px;
  position: relative;
  text-align: left;
  width: 100%;
}
.pp-pulse { opacity: .22; position: absolute; right: -14px; top: 50%; transform: translateY(-50%); }
.pp-pulse svg { animation: beat 1.6s ease-in-out infinite; }
.pp-chip {
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 999px;
  color: var(--ink);
  cursor: pointer;
  font-family: "Nunito";
  font-size: 13px;
  font-weight: 700;
  padding: 8px 14px;
  transition: .15s;
}
.pp-chip.on { background: var(--amber); border-color: var(--amber); color: #fff; }
.pp-chip.sage.on { background: var(--sage); border-color: var(--sage); }
.pp-photoslot {
  align-items: center;
  aspect-ratio: 1;
  background: var(--amber-soft);
  border: 2px dashed #e7c9a6;
  border-radius: 18px;
  color: var(--amber-deep);
  cursor: pointer;
  display: grid;
  gap: 4px;
  padding: 0;
  place-items: center;
  text-align: center;
  transition: .15s;
}
.pp-photoslot.filled { background: var(--sage-soft); border-color: var(--sage); border-style: solid; color: var(--sage); }
.pp-map {
  background:
    linear-gradient(0deg, rgba(0, 0, 0, .04), rgba(0, 0, 0, .04)),
    repeating-linear-gradient(0deg, #e8f2ea 0 26px, #e2eee5 26px 52px),
    repeating-linear-gradient(90deg, transparent 0 60px, rgba(0, 0, 0, .03) 60px 61px);
  border: none;
  border-radius: 18px;
  cursor: pointer;
  display: block;
  height: 150px;
  overflow: hidden;
  padding: 0;
  position: relative;
  width: 100%;
}
.pp-road { background: #fff; border-radius: 4px; position: absolute; }
.pp-pin {
  background: var(--sos);
  border-radius: 50% 50% 50% 6px;
  box-shadow: 0 8px 16px -4px rgba(229, 70, 46, .6);
  display: grid;
  height: 42px;
  left: 50%;
  place-items: center;
  position: absolute;
  rotate: 45deg;
  top: 50%;
  transform: translate(-50%, -100%);
  width: 42px;
}
.pp-pin svg { rotate: -45deg; }
.pp-btn {
  align-items: center;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  font-family: "Nunito";
  font-size: 15px;
  font-weight: 800;
  gap: 8px;
  justify-content: center;
  padding: 15px;
  width: 100%;
}
.pp-btn-amber { background: var(--amber); box-shadow: 0 10px 20px -8px rgba(224, 134, 12, .7); color: #fff; }
.pp-btn-sos { background: var(--sos); box-shadow: 0 10px 20px -8px rgba(229, 70, 46, .6); color: #fff; }
.pp-btn-ghost { background: var(--bg); color: var(--ink); }
.pp-pill { align-items: center; border-radius: 999px; display: inline-flex; font-size: 11.5px; font-weight: 800; gap: 5px; padding: 4px 10px; }
.pp-stat { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; flex: 1; padding: 13px; }
.pp-statnum { font-family: "Fredoka"; font-size: 24px; font-weight: 600; line-height: 1; }
.pp-listcard { align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; display: flex; gap: 12px; padding: 12px; }
.pp-thumb { border-radius: 15px; display: grid; flex-shrink: 0; font-size: 30px; height: 60px; place-items: center; width: 60px; }
.pp-adopt { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
.pp-adopt-img { display: grid; font-size: 58px; height: 128px; place-items: center; position: relative; }
.pp-fav {
  background: rgba(255, 255, 255, .92);
  border: none;
  border-radius: 50%;
  color: var(--coral);
  cursor: pointer;
  display: grid;
  height: 34px;
  place-items: center;
  position: absolute;
  right: 9px;
  top: 9px;
  width: 34px;
}
.pp-result { border-radius: 20px; color: #fff; padding: 18px; }
.pp-toast {
  align-items: center;
  animation: rise .3s ease;
  background: var(--ink);
  border-radius: 16px;
  bottom: 84px;
  color: #fff;
  display: flex;
  font-size: 13.5px;
  font-weight: 700;
  gap: 10px;
  left: 16px;
  padding: 13px 16px;
  position: absolute;
  right: 16px;
  z-index: 20;
}
.pp-segment { background: var(--bg); border-radius: 14px; display: flex; gap: 4px; padding: 4px; }
.pp-seg {
  background: none;
  border: none;
  border-radius: 10px;
  color: var(--ink-soft);
  cursor: pointer;
  flex: 1;
  font-family: "Nunito";
  font-size: 13px;
  font-weight: 800;
  padding: 9px;
}
.pp-seg.on { background: var(--surface); box-shadow: 0 3px 8px -3px rgba(0, 0, 0, .15); color: var(--ink); }
.pp-account-hero { align-items: center; display: flex; flex-direction: column; gap: 7px; padding: 18px 0; text-align: center; }
.pp-avatar { align-items: center; background: var(--amber-soft); border-radius: 50%; color: var(--amber-deep); display: flex; height: 68px; justify-content: center; overflow: hidden; width: 68px; }
.pp-avatar img { height: 100%; object-fit: cover; width: 100%; }
.pp-field { color: var(--ink-soft); display: block; font-size: 12px; font-weight: 800; margin-bottom: 11px; }
.pp-field input, .pp-field select { background: var(--bg); border: 1px solid var(--line); border-radius: 13px; color: var(--ink); display: block; margin-top: 5px; outline: none; padding: 12px 13px; width: 100%; }
.pp-field input:focus, .pp-field select:focus { border-color: var(--amber); box-shadow: 0 0 0 3px var(--amber-soft); }
.pp-password-wrap { display: block; position: relative; }
.pp-password-wrap input { padding-right: 42px; }
.pp-eye-btn { align-items: center; background: none; border: none; color: var(--ink-soft); cursor: pointer; display: flex; height: 40px; justify-content: center; position: absolute; right: 4px; top: 6px; width: 40px; }
.pp-eye-btn:hover { color: var(--ink); }
.pp-role-grid { display: grid; gap: 7px; grid-template-columns: repeat(3, 1fr); margin: -4px 0 14px; }
.pp-role-choice { align-items: center; background: var(--bg); border: 1px solid var(--line); border-radius: 14px; color: var(--ink-soft); cursor: pointer; display: flex; flex-direction: column; font-size: 10px; font-weight: 800; gap: 5px; padding: 10px 4px; }
.pp-role-choice.on { background: var(--amber-soft); border-color: var(--amber); color: var(--amber-deep); }
.pp-password-checks { display: flex; flex-wrap: wrap; gap: 5px; margin: -4px 0 12px; }
.pp-password-checks span { align-items: center; background: var(--bg); border-radius: 999px; color: var(--ink-soft); display: flex; font-size: 10px; font-weight: 800; gap: 3px; padding: 4px 7px; }
.pp-password-checks span.ok { background: var(--sage-soft); color: var(--sage); }
.pp-check { align-items: flex-start; color: var(--ink-soft); display: flex; font-size: 11px; font-weight: 700; gap: 7px; line-height: 1.35; margin: 9px 0; }
.pp-check input { accent-color: var(--amber); margin-top: 2px; }
.pp-notice { align-items: flex-start; background: var(--amber-soft); border: 1px solid var(--amber); border-radius: 16px; color: var(--amber-deep); display: flex; gap: 10px; margin-bottom: 14px; padding: 12px; }
.pp-notice p { margin: 3px 0 0; }
.pp-notice input { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; color: var(--ink); margin-top: 8px; outline: none; padding: 9px 10px; width: 100%; }
.pp-upload { align-items: center; background: var(--sage-soft); border: 1px dashed var(--sage); border-radius: 14px; color: var(--sage); cursor: pointer; display: flex; font-size: 12.5px; font-weight: 800; gap: 8px; justify-content: center; margin: 12px 0; padding: 13px; }
.pp-auth-flow { display: flex; flex-direction: column; justify-content: center; min-height: 610px; padding: 18px 8px 28px; }
.pp-auth-screen { min-height: 100%; padding: 18px 24px 28px; position: relative; }
.pp-auth-back { left: 16px; position: absolute; top: 16px; z-index: 2; }
.pp-build-pill { background: var(--amber-soft); border: 1px solid var(--amber); border-radius: 999px; color: var(--amber-deep); font-size: 10px; font-weight: 900; padding: 4px 8px; position: absolute; right: 16px; text-transform: uppercase; top: 18px; z-index: 2; }
.pp-auth-head { align-items: center; display: flex; flex-direction: column; gap: 9px; margin-bottom: 22px; text-align: center; }
.pp-auth-icon {
  align-items: center;
  background: var(--amber);
  border-radius: 26px;
  box-shadow: 0 18px 30px -18px rgba(224, 134, 12, .8);
  display: grid;
  font-size: 34px;
  height: 86px;
  place-items: center;
  width: 86px;
}
.pp-auth-icon.sage { background: var(--sage); box-shadow: 0 18px 30px -18px rgba(63, 155, 126, .8); }
.pp-auth-title { font-family: "Fredoka"; font-size: 34px; font-weight: 700; letter-spacing: -.8px; line-height: 1; margin: 6px 0 0; }
.pp-auth-sub { color: var(--ink-soft); font-size: 19px; font-weight: 700; line-height: 1.35; margin: 0; }
.pp-auth-choice {
  align-items: center;
  background: var(--surface);
  border: 1.5px solid #d9c9ba;
  border-radius: 18px;
  color: var(--ink);
  cursor: pointer;
  display: grid;
  gap: 13px;
  grid-template-columns: 52px 1fr 24px;
  min-height: 104px;
  overflow: hidden;
  padding: 17px;
  position: relative;
  text-align: left;
}
.pp-auth-choice b { display: block; font-family: "Fredoka"; font-size: 21px; line-height: 1.05; }
.pp-auth-choice span { color: var(--ink-soft); display: block; font-size: 15px; font-weight: 800; line-height: 1.35; margin-top: 5px; }
.pp-auth-choice-icon { align-items: center; background: #fff0f1; border-radius: 16px; color: #4285f4; display: grid; font-size: 25px; font-weight: 900; height: 52px; place-items: center; width: 52px; }
.pp-google-hitarea { inset: 0; opacity: .001; position: absolute; }
.pp-google-hitarea > div { height: 100% !important; width: 100% !important; }
.pp-auth-foot { color: var(--ink-soft); font-size: 15px; font-weight: 900; margin: 120px 0 0; text-align: center; }
.pp-phone-entry { color: var(--ink-soft); display: block; font-size: 15px; font-weight: 900; margin-bottom: 15px; }
.pp-phone-input {
  align-items: center;
  background: var(--bg);
  border: 2px solid var(--amber);
  border-radius: 22px;
  box-shadow: 0 0 0 5px var(--amber-soft);
  display: flex;
  gap: 12px;
  margin-top: 9px;
  padding: 18px;
}
.pp-phone-input strong { background: #f4e7d8; border-radius: 11px; color: var(--ink); flex-shrink: 0; font-size: 18px; padding: 8px 11px; }
.pp-phone-input input { background: transparent; border: none; color: var(--ink); font-size: 19px; font-weight: 900; outline: none; width: 100%; }
.pp-auth-note {
  background: var(--sage-soft);
  border: 1.5px solid var(--sage);
  border-radius: 18px;
  color: var(--sage);
  font-size: 16px;
  font-weight: 900;
  line-height: 1.45;
  margin: 14px 0 26px;
  padding: 18px;
}
.pp-otp-wrap { display: block; margin: 14px 0 24px; position: relative; }
.pp-otp-wrap input { height: 1px; left: 50%; opacity: 0; position: absolute; top: 50%; width: 1px; }
.pp-otp-boxes { display: grid; gap: 11px; grid-template-columns: repeat(6, 1fr); }
.pp-otp-boxes span {
  align-items: center;
  background: var(--bg);
  border: 2px solid var(--line);
  border-radius: 18px;
  color: #e8d7c6;
  display: flex;
  font-family: "Fredoka";
  font-size: 30px;
  font-weight: 700;
  height: 58px;
  justify-content: center;
}
.pp-otp-boxes span.filled { border-color: var(--amber); box-shadow: 0 0 0 5px var(--amber-soft); color: var(--ink); }
.pp-sr-only { height: 1px; margin: -1px; overflow: hidden; position: absolute; width: 1px; }
.pp-auth-roles { margin: 0 0 22px; }
.pp-auth-roles .pp-role-choice { border-radius: 18px; font-size: 13px; gap: 8px; min-height: 82px; }
.pp-consent-backdrop { align-items: center; background: rgba(42, 29, 22, .56); display: flex; inset: 0; justify-content: center; padding: 18px; position: fixed; z-index: 10000; }
.pp-consent { background: var(--surface); border-radius: 22px; box-shadow: 0 20px 50px rgba(42, 29, 22, .28); padding: 22px 18px 18px; position: relative; text-align: center; width: min(340px, 100%); }
.pp-consent .pp-btn + .pp-btn { margin-top: 9px; }
.pp-consent-close { position: absolute; right: 10px; top: 10px; }
.pp-location-sharing { color: var(--sage); font-size: 11.5px; font-weight: 800; margin: 7px 0 0; text-align: center; }
.pp-location-confirmation { background: var(--surface); border: 1px solid var(--sage); border-radius: 14px; bottom: 12px; color: var(--sage); font-size: 11px; font-weight: 800; left: 50%; padding: 7px 11px; position: absolute; transform: translateX(-50%); white-space: nowrap; z-index: 900; }

@keyframes beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 430px) {
  .pp-phone { border-radius: 28px; box-shadow: 0 18px 40px -16px rgba(58, 42, 34, .4); height: 88vh; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;
