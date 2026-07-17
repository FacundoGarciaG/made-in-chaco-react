import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { logger } from "../config/logger.js";

const palabrasIniciales = [
  "¡Che!", "Mba'eichapa", "Piojento", "Chivo", "Gurí", "Chipá",
  "Tereré", "Mba'e", "Kurepa", "Pombero", "Quebracho", "Ñandú",
  "Chaquero", "Criollo", "Chamamecero", "Payé", "Tapera", "Pajonal",
  "Cañada", "Monte chaqueño", "Brasita de fuego", "Urutaú", "Surubí",
  "Dorado", "Albahaca", "Pitanga", "Mburucuyá", "Viraró", "Itín",
  "Palma caranday", "Totora", "Camalote", "Aguará", "Ñacurutú",
  "Garza blanca", "Chajá", "Tero", "Carancho", "Chimango",
  "Bien mesura", "Minga", "Nomás", "¡Dale!", "Barbaridad",
  "Ranchada", "Rodeo", "Jineteada", "Festival del Chamamé",
  "Sapukay", "Quincho", "Tarea", "Linyera", "Gaucho", "Resero",
  "Tropilla", "Bombo legüero", "Chacarera", "Zamba", "Carnaval",
  "Fogón", "Mate cocido", "Asado criollo", "Dulce de mamón",
  "Queso de campo", "Chipá cuerito", "Sopa paraguaya", "Mbaipy",
  "Vori vori", "Locro", "Pastelitos", "Tortas fritas",
  "Alfajor de almidón", "Guiso carrero", "Pororó",
  "Nevada chaqueña", "Chaco profundo", "Tierra colorada",
  "Costanera", "Impenetrable", "Estero", "Bañado", "Palmar",
  "Río Paraná", "Río Bermejo", "Parque de la Democracia",
];

async function seed() {
  try {
    logger.info("Seeding database...");

    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO usuarios (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING",
      ["admin", hash],
    );
    logger.info("✓ Usuario admin creado (admin / admin123)");

    for (const p of palabrasIniciales) {
      await pool.query(
        "INSERT INTO palabras_chaco (palabra) VALUES ($1) ON CONFLICT DO NOTHING",
        [p],
      );
    }
    logger.info(`✓ ${palabrasIniciales.length} palabras chaqueñas agregadas`);

    logger.info("Seed completo ✓");
    process.exit(0);
  } catch (err) {
    logger.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
