process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import http from "node:http";

vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
vi.mock("../services/socket.js", () => ({ getIO: vi.fn(() => null) }));
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Token requerido" });
    try {
      req.user = jwt.verify(header.split(" ")[1], "test-secret-key");
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }
  },
}));
vi.mock("../services/gamificacion.js", () => ({
  calcularPuntos: vi.fn((tipo) => {
    const map = { comercio: 10, artesano: 15, experiencia: 20, patrimonio: 25, comunidad_indigena: 30 };
    return map[tipo] || 10;
  }),
  verificarLogros: vi.fn().mockResolvedValue([]),
}));

import pool from "../config/db.js";
import { verificarLogros } from "../services/gamificacion.js";

function mockQuery(resolver) {
  pool.query = typeof resolver === "function" ? vi.fn(resolver) : vi.fn().mockResolvedValue(resolver);
}

function makeToken(id = 1) {
  return jwt.sign({ id, email: "test@test.com", tipo: "publico" }, "test-secret-key", { expiresIn: "1h" });
}

function adminToken(id = 99) {
  return jwt.sign({ id, username: "admin" }, "test-secret-key", { expiresIn: "1h" });
}

async function req(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { hostname: "127.0.0.1", port, path, method, headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        let chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          let json = null;
          try { json = JSON.parse(raw); } catch {}
          resolve({ status: res.statusCode, json });
        });
      },
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

let app, server;
const PORT = 18902;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  const mod = await import("../routes/sellos.js");
  app.use("/api", mod.default);
  await new Promise((r) => { server = app.listen(PORT, r); });
});

afterAll(() => { server?.close(); });
beforeEach(() => { vi.clearAllMocks(); });

// ─── Scan ───────────────────────────────────────────────────
describe("POST /api/sellos/scan", () => {
  it("escaneo exitoso devuelve puntos y total", async () => {
    mockQuery((sql) => {
      if (sql.includes("entidades WHERE id")) return Promise.resolve({ rows: [{ id: 1, nombre: "Bar", perfil_id: 99, tipo: "comercio" }] });
      if (sql.includes("INSERT INTO sellos_coleccion")) return Promise.resolve({ rows: [{ id: 10 }] });
      if (sql.includes("COUNT(*)::int AS total")) return Promise.resolve({ rows: [{ total: 1, puntos: 10 }] });
      return Promise.resolve({ rows: [] });
    });

    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 1 }, { Authorization: `Bearer ${makeToken(1)}` });
    expect(res.status).toBe(200);
    expect(res.json.collected).toBe(true);
    expect(res.json.puntos_ganados).toBe(10);
    expect(res.json.total).toBe(1);
  });

  it("devuelve 400 si falta entidad_id", async () => {
    const res = await req(PORT, "POST", "/api/sellos/scan", {}, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si entidad no existe", async () => {
    mockQuery((sql) => {
      if (sql.includes("entidades WHERE id")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 999 }, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(404);
  });

  it("devuelve 403 si intenta escanear sello propio", async () => {
    mockQuery((sql) => {
      if (sql.includes("entidades WHERE id")) return Promise.resolve({ rows: [{ id: 1, nombre: "Mi Bar", perfil_id: 1, tipo: "comercio" }] });
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 1 }, { Authorization: `Bearer ${makeToken(1)}` });
    expect(res.status).toBe(403);
    expect(res.json.error).toMatch(/propia/i);
  });

  it("devuelve already_collected si ya tiene el sello", async () => {
    mockQuery((sql) => {
      if (sql.includes("entidades WHERE id")) return Promise.resolve({ rows: [{ id: 1, nombre: "Bar", perfil_id: 99, tipo: "comercio" }] });
      if (sql.includes("INSERT INTO sellos_coleccion")) return Promise.resolve({ rows: [] }); // ON CONFLICT DO NOTHING
      if (sql.includes("COUNT(*)::int AS total")) return Promise.resolve({ rows: [{ total: 5, puntos: 50 }] });
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 1 }, { Authorization: `Bearer ${makeToken(1)}` });
    expect(res.status).toBe(200);
    expect(res.json.already_collected).toBe(true);
    expect(res.json.nuevos_logros).toEqual([]);
  });

  it("llama a verificarLogros cuando el sello es nuevo", async () => {
    verificarLogros.mockResolvedValueOnce(["explorador"]);
    mockQuery((sql) => {
      if (sql.includes("entidades WHERE id")) return Promise.resolve({ rows: [{ id: 1, nombre: "Bar", perfil_id: 99, tipo: "comercio" }] });
      if (sql.includes("INSERT INTO sellos_coleccion")) return Promise.resolve({ rows: [{ id: 10 }] });
      if (sql.includes("COUNT(*)::int AS total")) return Promise.resolve({ rows: [{ total: 1, puntos: 10 }] });
      return Promise.resolve({ rows: [] });
    });

    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 1 }, { Authorization: `Bearer ${makeToken(1)}` });
    expect(verificarLogros).toHaveBeenCalledWith(1);
    expect(res.json.nuevos_logros).toContain("explorador");
  });

  it("devuelve 401 sin token", async () => {
    const res = await req(PORT, "POST", "/api/sellos/scan", { entidad_id: 1 });
    expect(res.status).toBe(401);
  });
});

// ─── Mis sellos ────────────────────────────────────────────
describe("GET /api/sellos/mis-sellos", () => {
  it("devuelve sellos y puntos del usuario", async () => {
    mockQuery((sql) => {
      if (sql.includes("sellos_coleccion sc") && sql.includes("ORDER BY")) {
        return Promise.resolve({ rows: [{ id: 1, entidad_id: 1, puntos: 10 }] });
      }
      if (sql.includes("COALESCE(SUM(puntos)")) return Promise.resolve({ rows: [{ total_puntos: 50 }] });
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "GET", "/api/sellos/mis-sellos", null, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(200);
    expect(res.json.total_puntos).toBe(50);
    expect(res.json.sellos).toHaveLength(1);
  });

  it("devuelve 401 sin token", async () => {
    const res = await req(PORT, "GET", "/api/sellos/mis-sellos");
    expect(res.status).toBe(401);
  });
});

// ─── Logros ─────────────────────────────────────────────────
describe("GET /api/sellos/logros", () => {
  it("devuelve logros con estado de desbloqueo", async () => {
    mockQuery((sql) => {
      if (sql.includes("FROM logros ORDER BY")) {
        return Promise.resolve({ rows: [{ id: 1, codigo: "explorador", nombre: "Explorador", descripcion: "5 sellos", icono: "🗺️", tipo: "general", requisito_min: 5 }] });
      }
      if (sql.includes("FROM logros_usuario lu")) {
        return Promise.resolve({ rows: [{ logro_id: 1, desbloqueado_at: new Date() }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "GET", "/api/sellos/logros", null, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(200);
    expect(res.json).toHaveLength(1);
    expect(res.json[0].desbloqueado).toBe(true);
    expect(res.json[0].desbloqueado_at).toBeDefined();
  });
});

// ─── Ranking ────────────────────────────────────────────────
describe("GET /api/sellos/ranking", () => {
  it("devuelve ranking público", async () => {
    mockQuery((sql) => {
      if (sql.includes("FROM perfiles p")) {
        return Promise.resolve({
          rows: [
            { perfil_id: 1, nombre: "Juan", total_sellos: 10, total_puntos: 100, total_logros: 3 },
            { perfil_id: 2, nombre: "Ana", total_sellos: 5, total_puntos: 50, total_logros: 1 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await req(PORT, "GET", "/api/sellos/ranking");
    expect(res.status).toBe(200);
    expect(res.json).toHaveLength(2);
    expect(res.json[0].total_puntos).toBeGreaterThan(res.json[1].total_puntos);
  });

  it("filtro por mes incluye date_trunc", async () => {
    mockQuery((sql) => {
      if (sql.includes("FROM perfiles p")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    await req(PORT, "GET", "/api/sellos/ranking?periodo=mes");
    const calledSql = pool.query.mock.calls[0][0];
    expect(calledSql).toContain("date_trunc('month'");
  });

  it("filtro por año incluye date_trunc", async () => {
    mockQuery((sql) => {
      if (sql.includes("FROM perfiles p")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    await req(PORT, "GET", "/api/sellos/ranking?periodo=anio");
    const calledSql = pool.query.mock.calls[0][0];
    expect(calledSql).toContain("date_trunc('year'");
  });
});

// ─── Stats ──────────────────────────────────────────────────
describe("GET /api/sellos/stats/:entidadId", () => {
  it("devuelve stats de escaneos", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [{ total_scans: 25, unique_users: 18 }] });
    const res = await req(PORT, "GET", "/api/sellos/stats/1");
    expect(res.status).toBe(200);
    expect(res.json.total_scans).toBe(25);
    expect(res.json.unique_users).toBe(18);
  });
});

// ─── Check ──────────────────────────────────────────────────
describe("GET /api/sellos/check/:entidadId", () => {
  it("devuelve collected: true si tiene el sello", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const res = await req(PORT, "GET", "/api/sellos/check/1", null, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(200);
    expect(res.json.collected).toBe(true);
  });

  it("devuelve collected: false si no tiene el sello", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await req(PORT, "GET", "/api/sellos/check/1", null, { Authorization: `Bearer ${makeToken()}` });
    expect(res.status).toBe(200);
    expect(res.json.collected).toBe(false);
  });
});
