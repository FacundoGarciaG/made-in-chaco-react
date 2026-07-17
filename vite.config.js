/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/*.png",
        "imagenes/*.png",
      ],
      manifest: {
        name: "Made in Chaco",
        short_name: "Made in Chaco",
        description: "Historias, sonidos y colores del secreto de Argentina",
        theme_color: "#1a0e08",
        background_color: "#1a0e08",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/imagenes/madeinchacoclaro.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/imagenes/madeinchacoclaro.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/imagenes/madeinchacoclaro.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        globIgnores: ["**/audios/**", "**/assets/231933_small*", "**/assets/logo-sintitulo*", "**/assets/madeinchacoclaro*"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/api\/entidades$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-entidades",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/entidad\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-entidad-detail",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/(localidades|departamentos|provincia|mapa-puntos)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-map-data",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/recorridos/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-recorridos",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/capas-historicas/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-capas-historicas",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/entidades\/\d+\/(conexiones|multimedia)/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-entity-related",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/palabras/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-palabras",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/sellos\/ranking/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-ranking",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(png|svg|jpg|jpeg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-other",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
      },
    }),
  ],
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
