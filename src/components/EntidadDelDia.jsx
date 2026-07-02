import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { colorMapAdmin } from "../admin/helpers";

export function EntidadDelDia() {
  const [entidad, setEntidad] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/analytics/entidad-del-dia")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.slug) {
          setEntidad({ nombre: data.nombre, slug: data.slug, tipo: data.tipo });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!entidad) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [entidad]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="entidad-dia"
          initial={{ opacity: 0, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 150 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Link to={`/entidad/${entidad.slug}`} className="entidad-dia-link">
            <span className="entidad-dia-label">Entidad del día</span>
            <span className="entidad-dia-tipo" style={{ background: colorMapAdmin[entidad.tipo] || "#888" }}>
              {entidad.tipo.replace(/_/g, " ")}
            </span>
            <span className="entidad-dia-nombre">{entidad.nombre}</span>
            <span className="entidad-dia-cta">Explorar →</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
