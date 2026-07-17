process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
vi.mock("../config/cloudinary.js", () => ({
  cloudinary: { v2: { uploader: { destroy: vi.fn().mockResolvedValue({}) } } },
  publicIdDesdeUrl: vi.fn((url) => {
    if (!url) return null;
    const parts = url.split("/");
    return parts[parts.length - 1].replace(/\.[^.]+$/, "");
  }),
}));
vi.mock("../routes/notificaciones.js", () => ({ crearNotificacion: vi.fn().mockResolvedValue({}) }));
vi.mock("../services/mailer.js", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));

import pool from "../config/db.js";
import { cloudinary, publicIdDesdeUrl } from "../config/cloudinary.js";
import { crearNotificacion } from "../routes/notificaciones.js";
import { sendEmail } from "../services/mailer.js";

function mockQuery(impl) {
  pool.query = typeof impl === "function" ? vi.fn(impl) : vi.fn().mockResolvedValue(impl);
}

beforeEach(() => { vi.clearAllMocks(); });

describe("ejecutarCronEntidades", () => {
  let ejecutarCronEntidades;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
    vi.mock("../config/cloudinary.js", () => ({
      cloudinary: { v2: { uploader: { destroy: vi.fn().mockResolvedValue({}) } } },
      publicIdDesdeUrl: vi.fn((url) => {
        if (!url) return null;
        const parts = url.split("/");
        return parts[parts.length - 1].replace(/\.[^.]+$/, "");
      }),
    }));
    vi.mock("../routes/notificaciones.js", () => ({ crearNotificacion: vi.fn().mockResolvedValue({}) }));
    vi.mock("../services/mailer.js", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));
    const mod = await import("../cron/entidades.js");
    ejecutarCronEntidades = mod.ejecutarCronEntidades;
  });

  it("no hace nada cuando no hay entidades vencidas ni por vencer", async () => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
    const result = await ejecutarCronEntidades();
    expect(result).toEqual({ eliminadas: 0, porVencer: 0 });
    expect(crearNotificacion).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("elimina entidades vencidas >90 días y envía notificación + email", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("DELETE FROM entidades")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT e.id, e.nombre") && sql.includes("90 days") && !sql.includes("87 days")) {
        return Promise.resolve({
          rows: [{ id: 1, nombre: "Bar Viejo", perfil_id: 10, imagen: "http://img/test.jpg", icono: null, perfil_email: "owner@test.com" }],
        });
      }
      if (sql.includes("FROM multimedia WHERE entidad_id")) return Promise.resolve({ rows: [{ public_id: "multi/123" }] });
      if (sql.includes("87 days")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const result = await ejecutarCronEntidades();
    expect(result.eliminadas).toBe(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM entidades WHERE id"), [1]);
    expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith("multi/123", { invalidate: true });
    expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith("test");
    expect(crearNotificacion).toHaveBeenCalledWith(10, "entidad_eliminada", expect.any(String), expect.any(String), null);
    expect(sendEmail).toHaveBeenCalledWith("owner@test.com", expect.any(String), expect.any(String));
  });

  it("elimina entidades con icono y portada", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("SELECT e.id") && sql.includes("90 days") && !sql.includes("87 days")) {
        return Promise.resolve({
          rows: [{ id: 2, nombre: "Hostel", perfil_id: 20, imagen: "http://img/portada.jpg", icono: "http://img/icono.png", perfil_email: null }],
        });
      }
      if (sql.includes("FROM multimedia")) return Promise.resolve({ rows: [] });
      if (sql.includes("DELETE FROM entidades")) return Promise.resolve({ rows: [] });
      if (sql.includes("87 days")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await ejecutarCronEntidades();
    expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith("portada");
    expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith("icono");
    expect(crearNotificacion).toHaveBeenCalledWith(20, "entidad_eliminada", expect.any(String), expect.any(String), null);
    expect(sendEmail).not.toHaveBeenCalled(); // no email when perfil_email is null
  });

  it("notifica entidades por vencer (87-89 días)", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("90 days") && !sql.includes("87 days")) return Promise.resolve({ rows: [] });
      if (sql.includes("87 days")) {
        return Promise.resolve({
          rows: [{ id: 3, nombre: "Resto Nuevo", perfil_id: 30, perfil_email: "resto@test.com" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await ejecutarCronEntidades();
    expect(result.porVencer).toBe(1);
    expect(crearNotificacion).toHaveBeenCalledWith(30, "entidad_por_eliminar", expect.any(String), expect.any(String), 3);
    expect(sendEmail).toHaveBeenCalledWith("resto@test.com", expect.any(String), expect.any(String));
  });

  it("maneja múltiples entidades vencidas", async () => {
    pool.query = vi.fn((sql) => {
      if (sql.includes("SELECT e.id") && sql.includes("90 days") && !sql.includes("87 days")) {
        return Promise.resolve({
          rows: [
            { id: 1, nombre: "A", perfil_id: 10, imagen: null, icono: null, perfil_email: "a@test.com" },
            { id: 2, nombre: "B", perfil_id: 20, imagen: null, icono: null, perfil_email: "b@test.com" },
            { id: 3, nombre: "C", perfil_id: null, imagen: null, icono: null, perfil_email: null },
          ],
        });
      }
      if (sql.includes("FROM multimedia")) return Promise.resolve({ rows: [] });
      if (sql.includes("DELETE FROM entidades")) return Promise.resolve({ rows: [] });
      if (sql.includes("87 days")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const result = await ejecutarCronEntidades();
    expect(result.eliminadas).toBe(3);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM entidades WHERE id"), [1]);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM entidades WHERE id"), [2]);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM entidades WHERE id"), [3]);
    expect(crearNotificacion).toHaveBeenCalledTimes(2); // only for entities with perfil_id
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
