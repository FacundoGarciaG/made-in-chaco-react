import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db.js", () => ({
  default: { query: vi.fn() },
}));

const pool = (await import("../config/db.js")).default;

const mockQuery = (impl) => {
  pool.query = typeof impl === "function" ? vi.fn(impl) : vi.fn().mockResolvedValue(impl);
};

// ─── calcularPuntos ──────────────────────────────────────────
describe("calcularPuntos", () => {
  let calcularPuntos;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
    const mod = await import("./gamificacion.js");
    calcularPuntos = mod.calcularPuntos;
  });

  it("devuelve 10 para comercio", () => {
    expect(calcularPuntos("comercio")).toBe(10);
  });

  it("devuelve 10 para gastronomia", () => {
    expect(calcularPuntos("gastronomia")).toBe(10);
  });

  it("devuelve 15 para artesano", () => {
    expect(calcularPuntos("artesano")).toBe(15);
  });

  it("devuelve 20 para experiencia", () => {
    expect(calcularPuntos("experiencia")).toBe(20);
  });

  it("devuelve 25 para patrimonio", () => {
    expect(calcularPuntos("patrimonio")).toBe(25);
  });

  it("devuelve 30 para comunidad_indigena", () => {
    expect(calcularPuntos("comunidad_indigena")).toBe(30);
  });

  it("devuelve 30 para personalidad", () => {
    expect(calcularPuntos("personalidad")).toBe(30);
  });

  it("devuelve 10 por defecto para tipo desconocido", () => {
    expect(calcularPuntos("tipo_inventado")).toBe(10);
  });

  it("devuelve 10 para undefined/null", () => {
    expect(calcularPuntos(undefined)).toBe(10);
    expect(calcularPuntos(null)).toBe(10);
  });
});

// ─── verificarLogros ─────────────────────────────────────────
describe("verificarLogros", () => {
  let verificarLogros;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock("../config/db.js", () => ({ default: { query: vi.fn() } }));
    const mod = await import("./gamificacion.js");
    verificarLogros = mod.verificarLogros;
    pool.query = vi.fn();
  });

  it("devuelve array vacío cuando no hay logros disponibles", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) return { rows: [] };
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).toEqual([]);
  });

  it("desbloquea logro general cuando totalSellos >= requisito_min", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 5 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) {
        return { rows: [{ id: 1, codigo: "explorador", requisito_min: 5 }] };
      }
      if (sql.includes("SELECT id FROM logros_usuario WHERE perfil_id")) {
        return { rows: [] }; // not yet unlocked
      }
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) return { rows: [] };
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).toContain("explorador");
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO logros_usuario"),
      [1, 1],
    );
  });

  it("no desbloquea logro general si totalSellos < requisito_min", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 2 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) {
        return { rows: [{ id: 1, codigo: "explorador", requisito_min: 5 }] };
      }
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) return { rows: [] };
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).not.toContain("explorador");
  });

  it("no desbloquea logro ya desbloqueado", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 10 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) {
        return { rows: [{ id: 1, codigo: "explorador", requisito_min: 5 }] };
      }
      if (sql.includes("SELECT id FROM logros_usuario WHERE perfil_id")) {
        return { rows: [{ id: 99 }] }; // already unlocked
      }
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) return { rows: [] };
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).not.toContain("explorador");
  });

  it("desbloquea logro por departamento", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 3 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 3 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'departamento'")) {
        return { rows: [{ id: 2, codigo: "viajero", requisito_min: 3 }] };
      }
      if (sql.includes("SELECT id FROM logros_usuario WHERE perfil_id")) {
        return { rows: [] };
      }
      if (sql.includes("WHERE tipo = 'categoria'")) return { rows: [] };
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).toContain("viajero");
  });

  it("desbloquea logro de categoría cuando tiene todos los sellos del tipo", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 1 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) {
        return { rows: [{ id: 3, codigo: "gastronomico" }] };
      }
      if (sql.includes("SELECT COUNT(*)::int AS total FROM entidades WHERE tipo")) {
        return { rows: [{ total: 2 }] }; // 2 entidades gastronomia
      }
      if (sql.includes("FROM sellos_coleccion sc") && sql.includes("JOIN entidades e")) {
        return { rows: [{ total: 2 }] }; // user has 2 sellos of this type
      }
      if (sql.includes("SELECT id FROM logros_usuario WHERE perfil_id")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).toContain("gastronomico");
  });

  it("no desbloquea logro de categoría si no tiene todos los sellos", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 1 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) {
        return { rows: [{ id: 3, codigo: "gastronomico" }] };
      }
      if (sql.includes("SELECT COUNT(*)::int AS total FROM entidades WHERE tipo")) {
        return { rows: [{ total: 5 }] }; // 5 entidades gastronomia
      }
      if (sql.includes("FROM sellos_coleccion sc") && sql.includes("JOIN entidades e")) {
        return { rows: [{ total: 2 }] }; // user only has 2
      }
      if (sql.includes("SELECT id FROM logros_usuario WHERE perfil_id")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).not.toContain("gastronomico");
  });

  it("salta categoría sin tipos conocidos en tiposPorCategoria", async () => {
    mockQuery((sql) => {
      if (sql.includes("COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id")) {
        return { rows: [{ total: 1 }] };
      }
      if (sql.includes("COUNT(DISTINCT")) {
        return { rows: [{ total: 0 }] };
      }
      if (sql.includes("WHERE tipo = 'general'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'departamento'")) return { rows: [] };
      if (sql.includes("WHERE tipo = 'categoria'")) {
        return { rows: [{ id: 4, codigo: "codigo_falso" }] };
      }
      return { rows: [] };
    });

    const result = await verificarLogros(1);
    expect(result).toEqual([]);
  });
});
