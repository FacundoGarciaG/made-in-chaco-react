import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

async function seed() {
  try {
    console.log("Seeding database...");

    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO usuarios (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING",
      ["admin", hash],
    );
    console.log("✓ Usuario admin creado (admin / admin123)");

    console.log("Seed completo ✓");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
