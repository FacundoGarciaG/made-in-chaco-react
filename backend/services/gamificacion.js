import pool from "../config/db.js";

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

export function calcularPuntos(tipo) {
  return PUNTOS_POR_TIPO[tipo] || 10;
}

export function getPuntosPorTipo() {
  return { ...PUNTOS_POR_TIPO };
}

// Verificar y desbloquear logros para un usuario
export async function verificarLogros(perfilId) {
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
