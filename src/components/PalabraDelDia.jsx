import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export function PalabraDelDia() {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/palabras/del-dia")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="speech-bubble"
          initial={{ opacity: 0, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 150 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Link to={`/wikia/${data.slug}`} className="speech-bubble-link">
            <span className="speech-bubble-label">Pieza del día</span>
            <span className="speech-bubble-word">{data.palabra}</span>
            {data.significado && (
              <span className="speech-bubble-meaning">{data.significado}</span>
            )}
            <span className="speech-bubble-cta">Ver en La Colección →</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
