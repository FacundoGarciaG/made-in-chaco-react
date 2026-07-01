const CAMPOS_ENTIDAD = new Set([
  "acepta_tarjetas", "acceso", "actividades", "actividades_principales",
  "anios_experiencia", "año_referencia", "apodo", "autor",
  "biografia_larga", "biografia_resumida", "capacidad",
  "categoria_hospedaje", "categoria_natural",
  "certificaciones", "comunidad_etnica", "contacto",
  "contacto_comercial", "contacto_reserva", "contenido_completo",
  "cosmovision", "cuit", "declaratoria_oficial",
  "dias_abierto", "direccion_escrita", "duracion_dias",
  "duracion_experiencia", "email", "es_itinerante",
  "es_referente_comunidad", "estado_conservacion", "estado_pago",
  "estado_sello", "establecimientos_donde_probar",
  "estilo_arquitectonico", "etnia", "fecha_evento",
  "fecha_fin_suscripcion", "fecha_inicio_suscripcion",
  "fecha_nacimiento", "fecha_relato", "flora_fauna_destacada",
  "foto_perfil_url", "fotos_galeria_url", "historia_plato",
  "horario_apertura", "horario_cierre", "horarios",
  "icono", "imagen", "ingredientes_clave", "latitud",
  "lenguas", "link_entradas", "localidad_id", "longitud",
  "materiales_usados", "mejor_epoca", "metodos_produccion",
  "nombre", "nombre_completo", "operador", "precio_referencia",
  "profesion", "que_incluye", "razon_social",
  "receta_destacada", "redes_sociales", "resumen",
  "rubro_especifico", "servicios", "sitio_web", "slug",
  "taller_abierto", "tecnica_principal", "territorio_tradicional",
  "tipo", "tipo_experiencia", "tipo_espacio", "tipo_producto",
  "tipo_relato", "visible",
]);

export { CAMPOS_ENTIDAD };

/**
 * Build a parameterized SET clause for PostgreSQL UPDATE.
 * Returns { clause, values } where clause uses $N placeholders.
 *
 * @param {object} data - key/value pairs to set
 * @param {number} startAt - starting placeholder index (default 1)
 * @returns {{ clause: string, values: any[] } | null}
 */
export function buildSetClause(data, startAt = 1, allowedColumns = null) {
  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const parts = [];
  const values = [];
  let idx = startAt;

  for (const key of keys) {
    if (allowedColumns && !allowedColumns.has(key)) continue;
    parts.push(`${key} = $${idx}`);
    const v = data[key];
    values.push(v === "" || v === null || v === undefined ? null : v);
    idx++;
  }

  if (parts.length === 0) return null;

  return { clause: parts.join(", "), values };
}
