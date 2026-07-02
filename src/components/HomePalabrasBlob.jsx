import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

const BADGE_COLORS = {
  palabra: "#863819",
  frase: "#2D6A4F",
  dicho: "#5B4A9A",
  refran: "#B8860B",
  expresion: "#C75B39",
};

export function HomePalabrasBlob() {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch("/api/palabras?approved=true&limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 15);
          setWords(shuffled);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (words.length === 0) return;

    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 400);
    }, 3500);

    return () => clearInterval(timerRef.current);
  }, [words.length]);

  if (words.length === 0) {
    return (
      <div className="blob__palabras">
        <div className="blob__palabras-loading">Cargando...</div>
      </div>
    );
  }

  const current = words[index];

  return (
    <div className="blob__palabras">
      <Link to={`/wikia/${current.slug}`} className="blob__palabras-link">
        <span
          className="blob__palabras-badge"
          style={{ background: BADGE_COLORS[current.categoria] || "#888" }}
        >
          {current.categoria}
        </span>
        <span className={`blob__palabras-word ${visible ? "is-visible" : "is-hidden"}`}>
          {current.palabra}
        </span>
        {current.significado && (
          <span className={`blob__palabras-meaning ${visible ? "is-visible" : "is-hidden"}`}>
            {current.significado}
          </span>
        )}
      </Link>
    </div>
  );
}
