import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Puntos por tipo de entidad
const PUNTOS_POR_TIPO = {
  comercio: 10,
  gastronomia: 10,
  hospedaje: 10,
  artesano: 15,
  productor: 15,
  espacio_cultural: 15,
  experiencia: 20,
  evento: 20,
  patrimonio: 25,
  lugar_natural: 25,
  relato: 25,
  comunidad_indigena: 30,
  personalidad: 30,
};

function calcularPuntos(tipo) {
  return PUNTOS_POR_TIPO[tipo] || 10;
}

// Verificar y desbloquear logros para un usuario
async function verificarLogros(perfilId) {
  const nuevosLogros = [];

  // Contar sellos totales
  const { rows: sellosCount } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM sellos_coleccion WHERE perfil_id = $1",
    [perfilId],
  );
  const totalSellos = sellosCount[0].total;

  // Contar departamentos distintos
  const { rows: deptCount } = await pool.query(
    `SELECT COUNT(DISTINCT l.departamento_id)::int AS total
     FROM sellos_coleccion sc
     JOIN entidades e ON sc.entidad_id = e.id
     LEFT JOIN localidades l ON e.localidad_id = l.id
     WHERE sc.perfil_id = $1 AND l.departamento_id IS NOT NULL`,
    [perfilId],
  );
  const totalDept = deptCount[0].total;

  // Logros por cantidad de sellos (general)
  const logrosGeneral = await pool.query(
    "SELECT id, codigo, requisito_min FROM logros WHERE tipo = 'general'",
  );
  for (const logro of logrosGeneral.rows) {
    if (totalSellos >= logro.requisito_min) {
      const { rows: existing } = await pool.query(
        "SELECT id FROM logros_usuario WHERE perfil_id = $1 AND logro_id = $2",
        [perfilId, logro.id],
      );
      if (existing.length === 0) {
        await pool.query(
          "INSERT INTO logros_usuario (perfil_id, logro_id) VALUES ($1, $2)",
          [perfilId, logro.id],
        );
        nuevosLogros.push(logro.codigo);
      }
    }
  }

  // Logros por departamento
  const logrosDept = await pool.query(
    "SELECT id, codigo, requisito_min FROM logros WHERE tipo = 'departamento'",
  );
  for (const logro of logrosDept.rows) {
    if (totalDept >= logro.requisito_min) {
      const { rows: existing } = await pool.query(
        "SELECT id FROM logros_usuario WHERE perfil_id = $1 AND logro_id = $2",
        [perfilId, logro.id],
      );
      if (existing.length === 0) {
        await pool.query(
          "INSERT INTO logros_usuario (perfil_id, logro_id) VALUES ($1, $2)",
          [perfilId, logro.id],
        );
        nuevosLogros.push(logro.codigo);
      }
    }
  }

  // Logros por categoría — verificar si tiene TODOS los sellos de esa categoría
  const tiposPorCategoria = {
    gastronomico: ["gastronomia"],
    artesanal: ["artesano"],
    naturalista: ["lugar_natural"],
    patrimonio_vivo: ["patrimonio"],
  };

  const logrosCat = await pool.query(
    "SELECT id, codigo FROM logros WHERE tipo = 'categoria'",
  );
  for (const logro of logrosCat.rows) {
    const tipos = tiposPorCategoria[logro.codigo];
    if (!tipos) continue;

    // Contar entidades visibles de ese tipo
    const { rows: totalRow } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM entidades WHERE tipo = ANY($1) AND visible = true`,
      [tipos],
    );
    const totalEntidades = totalRow[0].total;
    if (totalEntidades === 0) continue;

    // Contar cuántas tiene el usuario
    const { rows: userRow } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM sellos_coleccion sc
       JOIN entidades e ON sc.entidad_id = e.id
       WHERE sc.perfil_id = $1 AND e.tipo = ANY($2)`,
      [perfilId, tipos],
    );
    const userCount = userRow[0].total;

    if (userCount >= totalEntidades) {
      const { rows: existing } = await pool.query(
        "SELECT id FROM logros_usuario WHERE perfil_id = $1 AND logro_id = $2",
        [perfilId, logro.id],
      );
      if (existing.length === 0) {
        await pool.query(
          "INSERT INTO logros_usuario (perfil_id, logro_id) VALUES ($1, $2)",
          [perfilId, logro.id],
        );
        nuevosLogros.push(logro.codigo);
      }
    }
  }

  return nuevosLogros;
}

// POST /api/sellos/scan — registrar escaneo de QR y coleccionar sello
router.post("/sellos/scan", authMiddleware, async (req, res) => {
  try {
    const { entidad_id } = req.body;
    if (!entidad_id) {
      return res.status(400).json({ error: "entidad_id requerido" });
    }

    // Verificar que la entidad existe y está visible, traer tipo
    const { rows: ent } = await pool.query(
      "SELECT id, nombre, perfil_id, tipo FROM entidades WHERE id = $1 AND visible = true",
      [entidad_id],
    );
    if (ent.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }

    // No permitir coleccionar el sello de la propia entidad
    if (ent[0].perfil_id && ent[0].perfil_id === req.user.id) {
      return res.status(403).json({ error: "No podés coleccionar el sello de tu propia entidad" });
    }

    const puntos = calcularPuntos(ent[0].tipo);

    // Intentar insertar el sello con puntos
    const { rows } = await pool.query(
      `INSERT INTO sellos_coleccion (perfil_id, entidad_id, puntos)
       VALUES ($1, $2, $3)
       ON CONFLICT (perfil_id, entidad_id) DO NOTHING
       RETURNING id`,
      [req.user.id, entidad_id, puntos],
    );

    // Contar total de sellos y puntos del usuario
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*)::int AS total, COALESCE(SUM(puntos), 0)::int AS puntos FROM sellos_coleccion WHERE perfil_id = $1",
      [req.user.id],
    );

    // Verificar logros
    let nuevosLogros = [];
    if (rows.length > 0) {
      nuevosLogros = await verificarLogros(req.user.id);
    }

    if (rows.length > 0) {
      res.json({
        collected: true,
        total: countRows[0].total,
        puntos: countRows[0].puntos,
        puntos_ganados: puntos,
        nombre: ent[0].nombre,
        nuevos_logros: nuevosLogros,
      });
    } else {
      res.json({
        already_collected: true,
        total: countRows[0].total,
        puntos: countRows[0].puntos,
        nombre: ent[0].nombre,
        nuevos_logros: [],
      });
    }
  } catch (err) {
    console.error("Error POST /sellos/scan:", err);
    res.status(500).json({ error: "Error al coleccionar sello" });
  }
});

// GET /api/sellos/mis-sellos — sellos del usuario autenticado con puntos
router.get("/sellos/mis-sellos", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sc.id, sc.scanned_at, sc.puntos,
              e.id AS entidad_id, e.nombre, e.tipo, e.slug, e.imagen, e.resumen
       FROM sellos_coleccion sc
       JOIN entidades e ON sc.entidad_id = e.id
       WHERE sc.perfil_id = $1
       ORDER BY sc.scanned_at DESC`,
      [req.user.id],
    );

    // Puntos totales
    const { rows: pts } = await pool.query(
      "SELECT COALESCE(SUM(puntos), 0)::int AS total_puntos FROM sellos_coleccion WHERE perfil_id = $1",
      [req.user.id],
    );

    res.json({ sellos: rows, total_puntos: pts[0].total_puntos });
  } catch (err) {
    console.error("Error GET /sellos/mis-sellos:", err);
    res.status(500).json({ error: "Error al obtener sellos" });
  }
});

// GET /api/sellos/logros — logros del usuario autenticado
router.get("/sellos/logros", authMiddleware, async (req, res) => {
  try {
    // Todos los logros del sistema
    const { rows: todosLogros } = await pool.query(
      "SELECT id, codigo, nombre, descripcion, icono, tipo, requisito_min FROM logros ORDER BY id"
    );

    // Logros desbloqueados por el usuario
    const { rows: userLogros } = await pool.query(
      `SELECT lu.logro_id, lu.desbloqueado_at
       FROM logros_usuario lu
       WHERE lu.perfil_id = $1`,
      [req.user.id],
    );

    const userLogroMap = {};
    for (const ul of userLogros) {
      userLogroMap[ul.logro_id] = ul.desbloqueado_at;
    }

    const resultado = todosLogros.map((l) => ({
      ...l,
      desbloqueado: !!userLogroMap[l.id],
      desbloqueado_at: userLogroMap[l.id] || null,
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Error GET /sellos/logros:", err);
    res.status(500).json({ error: "Error al obtener logros" });
  }
});

// GET /api/sellos/ranking — ranking público de perfiles
router.get("/sellos/ranking", async (req, res) => {
  try {
    const { periodo } = req.query; // 'mes', 'anio', o null (todos)

    let dateFilter = "";
    if (periodo === "mes") {
      dateFilter = "AND sc.scanned_at >= date_trunc('month', NOW())";
    } else if (periodo === "anio") {
      dateFilter = "AND sc.scanned_at >= date_trunc('year', NOW())";
    }

    const { rows } = await pool.query(
      `SELECT p.id AS perfil_id, p.nombre, p.avatar_url,
              COUNT(sc.id)::int AS total_sellos,
              COALESCE(SUM(sc.puntos), 0)::int AS total_puntos,
              (SELECT COUNT(*) FROM logros_usuario lu WHERE lu.perfil_id = p.id)::int AS total_logros
       FROM perfiles p
       JOIN sellos_coleccion sc ON sc.perfil_id = p.id
       WHERE p.deleted_at IS NULL ${dateFilter}
       GROUP BY p.id, p.nombre, p.avatar_url
       ORDER BY total_puntos DESC, total_sellos DESC
       LIMIT 50`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Error GET /sellos/ranking:", err);
    res.status(500).json({ error: "Error al obtener ranking" });
  }
});

// GET /api/sellos/stats/:entidadId — stats públicos de escaneos de una entidad
router.get("/sellos/stats/:entidadId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_scans,
         COUNT(DISTINCT perfil_id)::int AS unique_users
       FROM sellos_coleccion
       WHERE entidad_id = $1`,
      [req.params.entidadId],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /sellos/stats:", err);
    res.status(500).json({ error: "Error al obtener stats" });
  }
});

// GET /api/sellos/check/:entidadId — verificar si el usuario ya coleccionó un sello
router.get("/sellos/check/:entidadId", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM sellos_coleccion WHERE perfil_id = $1 AND entidad_id = $2",
      [req.user.id, req.params.entidadId],
    );
    res.json({ collected: rows.length > 0 });
  } catch (err) {
    console.error("Error GET /sellos/check:", err);
    res.status(500).json({ error: "Error al verificar sello" });
  }
});

export default router;
