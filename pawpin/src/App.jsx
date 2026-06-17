import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/AppShell.jsx";
import { AdoptScreen } from "./screens/AdoptScreen.jsx";
import { HealthScreen } from "./screens/HealthScreen.jsx";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { LostScreen } from "./screens/LostScreen.jsx";
import { MapScreen } from "./screens/MapScreen.jsx";
import { RescueScreen } from "./screens/RescueScreen.jsx";
import { AccountScreen } from "./screens/AccountScreen.jsx";
import { getMe, hasSession, logout } from "./services/auth.js";

export default function App() {
  const [tab, setTab] = useState(window.location.pathname.startsWith("/admin") ? "account" : "home");
  const [toast, setToast] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const toastTimer = useRef(null);

  const refreshAccount = async () => {
    if (!hasSession()) {
      setAccountData(null);
      return;
    }
    try {
      setAccountData(await getMe());
    } catch {
      logout();
      setAccountData(null);
    }
  };

  useEffect(() => {
    refreshAccount();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const ping = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  return (
    <AppShell
      activeTab={tab}
      onAccount={() => setTab("account")}
      onDonate={() => ping("Donation sent — thank you! 💛")}
      onTabChange={setTab}
      toast={toast}
      user={accountData?.user}
    >
      {tab === "home" && <HomeScreen go={setTab} donate={() => ping("Donation sent — thank you! 💛")} />}
      {tab === "rescue" && <RescueScreen toast={ping} />}
      {tab === "lost" && <LostScreen toast={ping} />}
      {tab === "map" && <MapScreen toast={ping} />}
      {tab === "adopt" && <AdoptScreen />}
      {tab === "health" && <HealthScreen />}
      {tab === "account" && <AccountScreen
        data={accountData}
        onAuthenticated={async () => {
          await refreshAccount();
          setTab("home");
        }}
        onBack={() => setTab("home")}
        onLogout={() => { logout(); setAccountData(null); setTab("home"); ping("Signed out"); }}
        refresh={refreshAccount}
        toast={ping}
      />}
    </AppShell>
  );
}
