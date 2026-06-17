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

const VALID_TABS = new Set(["home", "rescue", "lost", "map", "adopt", "health", "account"]);

function getInitialTab() {
  if (window.location.pathname.startsWith("/admin")) return "account";
  const hashTab = window.location.hash.replace("#", "");
  return VALID_TABS.has(hashTab) ? hashTab : "home";
}

export default function App() {
  const [tab, setTab] = useState(getInitialTab);
  const [toast, setToast] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const toastTimer = useRef(null);

  const navigate = (nextTab) => {
    if (!VALID_TABS.has(nextTab)) return;
    setTab(nextTab);
    const nextHash = `#${nextTab}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  };

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
    const syncTabFromUrl = () => setTab(getInitialTab());
    window.addEventListener("hashchange", syncTabFromUrl);
    window.addEventListener("popstate", syncTabFromUrl);
    return () => {
      clearTimeout(toastTimer.current);
      window.removeEventListener("hashchange", syncTabFromUrl);
      window.removeEventListener("popstate", syncTabFromUrl);
    };
  }, []);

  const ping = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  return (
    <AppShell
      activeTab={tab}
      onAccount={() => navigate("account")}
      onDonate={() => ping("Donation sent — thank you! 💛")}
      onTabChange={navigate}
      toast={toast}
      user={accountData?.user}
    >
      {tab === "home" && <HomeScreen go={navigate} donate={() => ping("Donation sent — thank you! 💛")} />}
      {tab === "rescue" && <RescueScreen toast={ping} />}
      {tab === "lost" && <LostScreen toast={ping} />}
      {tab === "map" && <MapScreen toast={ping} />}
      {tab === "adopt" && <AdoptScreen />}
      {tab === "health" && <HealthScreen />}
      {tab === "account" && <AccountScreen
        data={accountData}
        onAuthenticated={(user) => {
          setAccountData((current) => ({ ...(current ?? {}), user }));
          navigate("home");
          refreshAccount();
        }}
        onBack={() => navigate("home")}
        onLogout={() => { logout(); setAccountData(null); navigate("home"); ping("Signed out"); }}
        refresh={refreshAccount}
        toast={ping}
      />}
    </AppShell>
  );
}
