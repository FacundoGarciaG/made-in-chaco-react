import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { createServer } from "http";
import { initSocket } from "./services/socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes from "./routes/auth.js";
import entidadRoutes from "./routes/entidades.js";
import multimediaRoutes from "./routes/multimedia.js";
import recorridoRoutes from "./routes/recorridos.js";
import localidadRoutes from "./routes/localidades.js";
import departamentoRoutes from "./routes/departamentos.js";
import uploadRoutes from "./routes/upload.js";
import contactoRoutes from "./routes/contacto.js";
import analyticsRoutes from "./routes/analytics.js";
import palabrasRoutes from "./routes/palabras.js";
import authPublicoRoutes from "./routes/auth_publico.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import planesRoutes from "./routes/planes.js";
import suscripcionesRoutes from "./routes/suscripciones.js";
import adminPerfilesRoutes from "./routes/admin_perfiles.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api", authRoutes);
app.use("/api", entidadRoutes);
app.use("/api", multimediaRoutes);
app.use("/api", recorridoRoutes);
app.use("/api", localidadRoutes);
app.use("/api", departamentoRoutes);
app.use("/api", uploadRoutes);
app.use("/api", contactoRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", palabrasRoutes);
app.use("/api", authPublicoRoutes);
app.use("/api", notificacionesRoutes);
app.use("/api", planesRoutes);
app.use("/api", suscripcionesRoutes);
app.use("/api", adminPerfilesRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve built frontend in production
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// SPA fallback
app.get("*", (_req, res, next) => {
  if (_req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✦ Made in Chaco API corriendo en http://localhost:${PORT}`);
});
