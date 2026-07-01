/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/") || id.includes("node_modules/zustand/") || id.includes("node_modules/socket.io-client/") || id.includes("node_modules/react-helmet-async/")) {
            return "vendor";
          }
          if (id.includes("node_modules/motion") || id.includes("node_modules/motion-plus/")) {
            return "motion";
          }
          if (id.includes("node_modules/mapbox-gl/") || id.includes("node_modules/react-map-gl/")) {
            return "mapbox";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
  },
});
