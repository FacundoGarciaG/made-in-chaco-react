import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import cron from "node-cron";
import { initSocket } from "./services/socket.js";
import { logger } from "./config/logger.js";
import { validateEnv } from "./config/env.js";
import { ejecutarCronEntidades } from "./cron/entidades.js";

validateEnv();

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
import capasHistoricasRoutes from "./routes/capas_historicas.js";
import capasHistoricasAdminRoutes from "./routes/capas_historicas_admin.js";
import sellosRoutes from "./routes/sellos.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
}));

const CORS_ORIGINS = process.env.NODE_ENV === "production"
  ? (process.env.CORS_ORIGIN || "").split(",").filter(Boolean)
  : ["http://localhost:5173", "http://localhost:3001"];

app.use(cors({
  origin: CORS_ORIGINS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rate limiting para rutas sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Demasiadas subidas. Intentá de nuevo en 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados mensajes. Intentá de nuevo en 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/registro", authLimiter);
app.use("/api/auth/login-publico", authLimiter);
app.use("/api/auth/olvide-password", authLimiter);
app.use("/api/auth/reestablecer-password", authLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/upload-public", uploadLimiter);
app.use("/api/delete-public-image", uploadLimiter);
app.use("/api/contacto", contactLimiter);

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
app.use("/api", capasHistoricasRoutes);
app.use("/api", capasHistoricasAdminRoutes);
app.use("/api", sellosRoutes);

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
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const httpServer = createServer(app);
initSocket(httpServer);

// Asegurar columna datos en notificaciones
(async () => {
  try {
    const pool = (await import("./config/db.js")).default;
    await pool.query(`ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB`);
  } catch {}
})();

// Cron diario: eliminar entidades vencidas hace 90+ días (corre a las 3am)
cron.schedule("0 3 * * *", async () => {
  try {
    const result = await ejecutarCronEntidades();
    if (result.eliminadas > 0 || result.porVencer > 0) {
      logger.info(`Cron: ${result.eliminadas} eliminadas, ${result.porVencer} por vencer`);
    }
  } catch (err) {
    logger.error("Error en cron de entidades vencidas:", err);
  }
});

httpServer.listen(PORT, () => {
  logger.info(`✦ Made in Chaco API corriendo en http://localhost:${PORT}`);
});
