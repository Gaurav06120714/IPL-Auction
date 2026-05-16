import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,

    // Allow ngrok domain
    allowedHosts: [
      "choleric-maile-resourceful.ngrok-free.dev"
    ],

    proxy: {
      // Proxy /api requests to backend
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },

      // Proxy socket.io to backend
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});