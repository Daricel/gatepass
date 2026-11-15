import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // reachable from your phone on the same Wi-Fi
    proxy: { "/api": "http://localhost:3000" },
  },
});
