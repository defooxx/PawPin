import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("Google Client ID in main.jsx:", googleClientId);
const app = googleClientId
  ? <GoogleOAuthProvider clientId={googleClientId}><AppErrorBoundary><App /></AppErrorBoundary></GoogleOAuthProvider>
  : <AppErrorBoundary><App /></AppErrorBoundary>;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {app}
  </React.StrictMode>,
);
