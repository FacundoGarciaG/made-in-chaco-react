import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { adminLoginRules } from "../middleware/validation.js";
import { JWT_SECRET, JWT_EXPIRY } from "../config/env.js";

const router = Router();

router.post("/auth/login", adminLoginRules, async (req, res) => {
  try {
    const { username, password } = req.body;

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
      { expiresIn: JWT_EXPIRY.admin },
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
