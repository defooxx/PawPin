import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-auth-nav-[hash].js",
        chunkFileNames: "assets/[name]-auth-nav-[hash].js",
        assetFileNames: "assets/[name]-auth-nav-[hash][extname]",
      },
    },
  },
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
