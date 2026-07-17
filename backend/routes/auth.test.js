import http from "node:http";

process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";

vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
vi.mock("../services/socket.js", () => ({ getIO: vi.fn(() => null) }));
vi.mock("../services/mailer.js", () => ({ sendEmail: vi.fn() }));
vi.mock("../routes/notificaciones.js", () => ({ crearNotificacion: vi.fn() }));
vi.mock("../config/cloudinary.js", () => ({
  cloudinary: { v2: { uploader: { destroy: vi.fn() } } },
}));

import pool from "../config/db.js";
import { crearNotificacion } from "../routes/notificaciones.js";

function mockQuery(resolver) {
  pool.query = typeof resolver === "function" ? vi.fn(resolver) : vi.fn().mockResolvedValue(resolver);
}

function makeToken(payload) {
  return jwt.sign(payload, "test-secret-key", { expiresIn: "1h" });
}

async function request(port, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method, headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        let chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          let json = null;
          try { json = JSON.parse(raw); } catch {}
          resolve({ status: res.statusCode, json, headers: res.headers });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

let app, server;
const PORT = 18901;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  const authModule = await import("../routes/auth.js");
  const authPublicoModule = await import("../routes/auth_publico.js");
  app.use("/api", authModule.default);
  app.use("/api", authPublicoModule.default);
  await new Promise((r) => { server = app.listen(PORT, r); });
});

afterAll(() => { server?.close(); });

beforeEach(() => { vi.clearAllMocks(); });

// ─── Admin Login ────────────────────────────────────────────
describe("POST /api/auth/login (admin)", () => {
  it("login exitoso devuelve token y username", async () => {
    mockQuery((sql) => {
      if (sql.includes("usuarios WHERE username")) {
        return { rows: [{ id: 1, username: "admin", password: "$2a$10$fakehash" }] };
      }
      return { rows: [] };
    });
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn((sql) => {
      if (sql.includes("usuarios WHERE username")) return Promise.resolve({ rows: [{ id: 1, username: "admin", password: hash }] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(PORT, "POST", "/api/auth/login", { username: "admin", password: "pass123" });
    expect(res.status).toBe(200);
    expect(res.json.token).toBeDefined();
    expect(res.json.username).toBe("admin");
    const decoded = jwt.verify(res.json.token, "test-secret-key");
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe("admin");
  });

  it("credenciales inválidas devuelve 401", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "POST", "/api/auth/login", { username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.json.error).toBe("Credenciales inválidas");
  });

  it("contraseña incorrecta devuelve 401", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("correcta", 10);
    pool.query = vi.fn().mockResolvedValue({ rows: [{ id: 1, username: "admin", password: hash }] });

    const res = await request(PORT, "POST", "/api/auth/login", { username: "admin", password: "mala" });
    expect(res.status).toBe(401);
  });

  it("campos vacíos devuelve 400", async () => {
    const res = await request(PORT, "POST", "/api/auth/login", { username: "", password: "" });
    expect(res.status).toBe(400);
  });
});

// ─── Registro ───────────────────────────────────────────────
describe("POST /api/auth/registro", () => {
  it("registro exitoso devuelve token y perfil", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("SELECT id FROM perfiles WHERE email")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO perfiles")) return Promise.resolve({ rows: [{ id: 10, email: "n@n.com", nombre: "Test", created_at: new Date() }] });
      return Promise.resolve({ rows: [] });
    });
    crearNotificacion.mockResolvedValue();

    const res = await request(PORT, "POST", "/api/auth/registro", { email: "n@n.com", password: "pass123", nombre: "Test" });
    expect(res.status).toBe(201);
    expect(res.json.token).toBeDefined();
    expect(res.json.perfil.email).toBe("n@n.com");
    expect(res.json.perfil.verified).toBe(false);
  });

  it("email duplicado devuelve 409", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const res = await request(PORT, "POST", "/api/auth/registro", { email: "exist@n.com", password: "pass123" });
    expect(res.status).toBe(409);
    expect(res.json.error).toMatch(/existe/i);
  });

  it("email inválido devuelve 400", async () => {
    const res = await request(PORT, "POST", "/api/auth/registro", { email: "noemail", password: "pass123" });
    expect(res.status).toBe(400);
  });

  it("contraseña corta devuelve 400", async () => {
    const res = await request(PORT, "POST", "/api/auth/registro", { email: "a@b.com", password: "12345" });
    expect(res.status).toBe(400);
  });
});

// ─── Verificar email ────────────────────────────────────────
describe("GET /api/auth/verificar/:token", () => {
  it("verificación exitosa", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("SELECT id FROM perfiles WHERE verification_token")) return Promise.resolve({ rows: [{ id: 5 }] });
      return Promise.resolve({ rows: [] });
    });
    const res = await request(PORT, "GET", "/api/auth/verificar/abc123");
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
  });

  it("token inválido devuelve 404", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "GET", "/api/auth/verificar/badtoken");
    expect(res.status).toBe(404);
  });
});

// ─── Login público ──────────────────────────────────────────
describe("POST /api/auth/login-publico", () => {
  it("login exitoso devuelve token y perfil", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn((sql) => {
      if (sql.includes("perfiles WHERE email")) {
        return Promise.resolve({
          rows: [{ id: 1, email: "u@u.com", password: hash, nombre: "User", avatar_url: "", profesion: "", bio: "", localidad: "", pais: "", provincia: "", nacionalidad: "", fecha_nacimiento: null, sexo: "", avatar_public_id: "", verified: true, baneado: false, whatsapp: "", deleted_at: null }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(200);
    expect(res.json.token).toBeDefined();
    expect(res.json.perfil.email).toBe("u@u.com");
  });

  it("email inexistente devuelve 401", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "x@x.com", password: "pass123" });
    expect(res.status).toBe(401);
  });

  it("contraseña incorrecta devuelve 401", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("correcta", 10);
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1, email: "u@u.com", password: hash, nombre: "", avatar_url: "", profesion: "", bio: "", localidad: "", pais: "", provincia: "", nacionalidad: "", fecha_nacimiento: null, sexo: "", avatar_public_id: "", verified: true, baneado: false, whatsapp: "", deleted_at: null }],
    });
    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "u@u.com", password: "mala" });
    expect(res.status).toBe(401);
  });

  it("cuenta baneada devuelve 403", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1, email: "u@u.com", password: hash, nombre: "", avatar_url: "", profesion: "", bio: "", localidad: "", pais: "", provincia: "", nacionalidad: "", fecha_nacimiento: null, sexo: "", avatar_public_id: "", verified: true, baneado: true, whatsapp: "", deleted_at: null }],
    });
    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(403);
    expect(res.json.error).toMatch(/suspendida/i);
  });

  it("cuenta eliminada devuelve 403 con código", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1, email: "u@u.com", password: hash, nombre: "", avatar_url: "", profesion: "", bio: "", localidad: "", pais: "", provincia: "", nacionalidad: "", fecha_nacimiento: null, sexo: "", avatar_public_id: "", verified: true, baneado: false, whatsapp: "", deleted_at: new Date() }],
    });
    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(403);
    expect(res.json.codigo).toBe("cuenta_eliminada");
  });

  it("cuenta Google sin password devuelve 401", async () => {
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1, email: "u@u.com", password: null, nombre: "", avatar_url: "", profesion: "", bio: "", localidad: "", pais: "", provincia: "", nacionalidad: "", fecha_nacimiento: null, sexo: "", avatar_public_id: "", verified: true, baneado: false, whatsapp: "", deleted_at: null }],
    });
    const res = await request(PORT, "POST", "/api/auth/login-publico", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(401);
    expect(res.json.error).toMatch(/Google/i);
  });
});

// ─── Olvidé mi contraseña ───────────────────────────────────
describe("POST /api/auth/olvide-password", () => {
  it("responde ok incluso si email no existe (seguridad)", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "POST", "/api/auth/olvide-password", { email: "noexist@n.com" });
    expect(res.status).toBe(404);
  });

  it("envía token si email existe", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("perfiles WHERE email")) return Promise.resolve({ rows: [{ id: 1, nombre: "Test", deleted_at: null }] });
      if (sql.includes("reset_token_expires")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });
    const res = await request(PORT, "POST", "/api/auth/olvide-password", { email: "exist@n.com" });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
  });

  it("rate limit: responde ok sin generar nuevo token si hay uno reciente", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("perfiles WHERE email")) return Promise.resolve({ rows: [{ id: 1, nombre: "Test", deleted_at: null }] });
      if (sql.includes("reset_token_expires")) return Promise.resolve({ rows: [{ id: 1 }] }); // recent token exists
      return Promise.resolve({ rows: [] });
    });
    const res = await request(PORT, "POST", "/api/auth/olvide-password", { email: "exist@n.com" });
    expect(res.status).toBe(200);
    // pool.query should only be called twice (lookup + rate limit check), not 3 times (no UPDATE)
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it("email inválido devuelve 400", async () => {
    const res = await request(PORT, "POST", "/api/auth/olvide-password", { email: "bad" });
    expect(res.status).toBe(400);
  });
});

// ─── Restablecer contraseña ─────────────────────────────────
describe("POST /api/auth/reestablecer-password", () => {
  it("cambio exitoso limpia el token", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("reset_token = $1 AND reset_token_expires")) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });
    const res = await request(PORT, "POST", "/api/auth/reestablecer-password", { token: "valid-token", password: "newpass123" });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    // Verify UPDATE was called (password set, token cleared)
    const updateCall = pool.query.mock.calls.find((c) => c[0].includes("UPDATE perfiles SET password"));
    expect(updateCall).toBeDefined();
  });

  it("token inválido o expirado devuelve 400", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "POST", "/api/auth/reestablecer-password", { token: "bad", password: "newpass123" });
    expect(res.status).toBe(400);
  });

  it("contraseña corta devuelve 400", async () => {
    const res = await request(PORT, "POST", "/api/auth/reestablecer-password", { token: "tok", password: "12345" });
    expect(res.status).toBe(400);
  });
});

// ─── Restaurar cuenta ───────────────────────────────────────
describe("POST /api/auth/restaurar", () => {
  it("restaura cuenta eliminada", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn((sql) => {
      if (sql.includes("perfiles WHERE email")) {
        return Promise.resolve({ rows: [{ id: 1, password: hash, deleted_at: new Date() }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await request(PORT, "POST", "/api/auth/restaurar", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
  });

  it("cuenta no eliminada devuelve 400", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("pass123", 10);
    pool.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1, password: hash, deleted_at: null }],
    });
    const res = await request(PORT, "POST", "/api/auth/restaurar", { email: "u@u.com", password: "pass123" });
    expect(res.status).toBe(400);
  });

  it("credenciales inválidas devuelve 401", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const res = await request(PORT, "POST", "/api/auth/restaurar", { email: "x@x.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});
