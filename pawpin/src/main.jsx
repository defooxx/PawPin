import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const app = googleClientId
  ? <GoogleOAuthProvider clientId={googleClientId}><App /></GoogleOAuthProvider>
  : <App />;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {app}
  </React.StrictMode>,
);
