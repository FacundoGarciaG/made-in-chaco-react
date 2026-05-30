import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "made-in-chaco-secret-dev";

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const { rows } = await pool.query(
      "SELECT id, username, password FROM usuarios WHERE username = $1",
      [username],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
