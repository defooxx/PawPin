import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prevent two copies of React loading (breaks hooks in react-leaflet)
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  server: {
    host: "0.0.0.0",
  },
  preview: {
    host: "0.0.0.0",
  },
});
