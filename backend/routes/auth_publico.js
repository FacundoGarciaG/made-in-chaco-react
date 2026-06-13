import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SITE_URL = process.env.SITE_URL || "http://localhost:5173";

function extractPublicId(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/");
    let versionIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (/^v\d+$/.test(segments[i])) {
        versionIdx = i;
        break;
      }
    }
    if (versionIdx === -1) return null;
    const publicIdWithExt = segments.slice(versionIdx + 1).join("/");
    const dotIdx = publicIdWithExt.lastIndexOf(".");
    return dotIdx > 0 ? publicIdWithExt.substring(0, dotIdx) : publicIdWithExt;
  } catch {
    return null;
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "made-in-chaco-secret-dev";

router.post("/auth/registro", async (req, res) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await pool.query("SELECT id FROM perfiles WHERE email = $1", [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const result = await pool.query(
      "INSERT INTO perfiles (email, password, nombre, verification_token) VALUES ($1, $2, $3, $4) RETURNING id, email, nombre, created_at",
      [email, hashed, nombre || "", verificationToken],
    );

    const perfil = result.rows[0];
    const token = jwt.sign(
      { id: perfil.id, email: perfil.email, tipo: "publico" },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      token,
      perfil: { id: perfil.id, email: perfil.email, nombre: perfil.nombre, verified: false },
    });
  } catch (err) {
    console.error("Registro error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/auth/verificar/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query(
      "SELECT id FROM perfiles WHERE verification_token = $1 AND verified = false",
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Token inválido o cuenta ya verificada" });
    }

    await pool.query(
      "UPDATE perfiles SET verified = true, verification_token = '' WHERE id = $1",
      [rows[0].id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Verificar error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.post("/auth/reenviar-verificacion", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT email, verification_token, verified FROM perfiles WHERE id = $1",
      [req.user.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Perfil no encontrado" });
    if (rows[0].verified) return res.json({ ok: true, alreadyVerified: true });

    const token = rows[0].verification_token;
    if (!token) return res.status(400).json({ error: "No hay token de verificación disponible" });

    const verifyLink = `${SITE_URL}/verificar/${token}`;
    const emailHtml = `
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="color:#863819;margin:0 0 8px">Confirmá tu cuenta</h2>
        <p style="color:#555;margin:0 0 20px;font-size:14px">Hacé clic en el botón para verificar tu email:</p>
        <a href="${verifyLink}" style="display:inline-block;padding:12px 28px;background:#863819;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Confirmar cuenta</a>
        <p style="color:#aaa;font-size:12px;margin-top:20px">O copiá este enlace:<br>${verifyLink}</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || "noreply@madeinchaco.com",
        to: rows[0].email,
        subject: "Made in Chaco — Confirmación de cuenta",
        html: emailHtml,
      });
    } catch {
      return res.status(500).json({ error: "Error al enviar el email" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Reenviar verificacion error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.post("/auth/login-publico", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const { rows } = await pool.query(
      "SELECT id, email, password, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, verified FROM perfiles WHERE email = $1",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const perfil = rows[0];

    if (!perfil.password) {
      return res.status(401).json({ error: "Esta cuenta usa Google Sign-In" });
    }

    const valid = await bcrypt.compare(password, perfil.password);
    if (!valid) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const token = jwt.sign(
      { id: perfil.id, email: perfil.email, tipo: "publico" },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      token,
      perfil: {
        id: perfil.id,
        email: perfil.email,
        nombre: perfil.nombre,
        avatar_url: perfil.avatar_url,
        profesion: perfil.profesion,
        bio: perfil.bio,
        localidad: perfil.localidad,
        pais: perfil.pais,
        provincia: perfil.provincia,
        nacionalidad: perfil.nacionalidad,
        fecha_nacimiento: perfil.fecha_nacimiento,
        sexo: perfil.sexo,
        avatar_public_id: perfil.avatar_public_id,
        verified: perfil.verified,
      },
    });
  } catch (err) {
    console.error("Login público error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/auth/perfil", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, google_id, verified, created_at FROM perfiles WHERE id = $1",
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Get perfil error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.put("/auth/perfil", authMiddleware, async (req, res) => {
  try {
    const { nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id } = req.body;

    const result = await pool.query(
      `UPDATE perfiles SET
        nombre = COALESCE($1, nombre),
        avatar_url = COALESCE($2, avatar_url),
        profesion = COALESCE($3, profesion),
        bio = COALESCE($4, bio),
        localidad = COALESCE($5, localidad),
        pais = COALESCE($6, pais),
        provincia = COALESCE($7, provincia),
        nacionalidad = COALESCE($8, nacionalidad),
        fecha_nacimiento = COALESCE($9, fecha_nacimiento),
        sexo = COALESCE($10, sexo),
        avatar_public_id = COALESCE($11, avatar_public_id),
        updated_at = NOW()
      WHERE id = $12
      RETURNING id, email, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, verified, created_at`,
      [nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const updated = result.rows[0];

    // Enviar email de verificación si la cuenta no está verificada aún
    const { rows: check } = await pool.query(
      "SELECT verified, verification_token FROM perfiles WHERE id = $1",
      [req.user.id],
    );
    if (!check[0].verified && check[0].verification_token) {
      const verifyLink = `${SITE_URL}/verificar/${check[0].verification_token}`;
      const fields = [
        { label: "Nombre", value: updated.nombre },
        { label: "Profesión", value: updated.profesion },
        { label: "Biografía", value: updated.bio },
        { label: "País", value: updated.pais },
        { label: "Provincia", value: updated.provincia },
        { label: "Localidad", value: updated.localidad },
        { label: "Nacionalidad", value: updated.nacionalidad },
        { label: "Sexo", value: updated.sexo },
        { label: "Fecha de nacimiento", value: updated.fecha_nacimiento ? new Date(updated.fecha_nacimiento).toISOString().split("T")[0] : "" },
      ].filter((f) => f.value);
      const rowsHtml = fields.map((f) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#555;font-size:13px;white-space:nowrap;vertical-align:top;font-weight:600">${f.label}</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px">${f.value}</td></tr>`
      ).join("");
      try {
        await transporter.sendMail({
          from: `"Made in Chaco" <${process.env.MAIL_USER}>`,
          to: updated.email,
          subject: "Confirmá tu cuenta en Made in Chaco",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
              <h2 style="color:#863819;margin:0 0 8px">Revisá tus datos</h2>
              <p style="color:#555;margin:0 0 20px;font-size:14px">Guardamos esta información en tu perfil:</p>
              <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
              <p style="color:#555;margin:24px 0 12px;font-size:14px">Si todo está bien, confirmá tu cuenta con este botón:</p>
              <a href="${verifyLink}" style="display:inline-block;padding:12px 28px;background:#863819;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Confirmar cuenta</a>
              <p style="color:#aaa;font-size:12px;margin-top:20px">O copiá este enlace:<br>${verifyLink}</p>
            </div>
          `,
        });
      } catch (err) {
        console.warn("Email de verificación no enviado:", err.message);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("Update perfil error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.delete("/auth/avatar", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT avatar_public_id FROM perfiles WHERE id = $1",
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const publicId = rows[0].avatar_public_id;

    if (publicId) {
      try {
        await cloudinary.v2.uploader.destroy(publicId);
      } catch {
        // ignore cloudinary error, proceed to clear DB
      }
    }

    await pool.query(
      "UPDATE perfiles SET avatar_url = '', avatar_public_id = '', updated_at = NOW() WHERE id = $1",
      [req.user.id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete avatar error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.delete("/auth/perfil", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM perfiles WHERE id = $1",
      [req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    // Find all entities owned by this profile
    const { rows: entidades } = await pool.query(
      "SELECT id, imagen FROM entidades WHERE perfil_id = $1",
      [req.user.id],
    );

    // Get profile data for cloudinary cleanup
    const { rows: perfilData } = await pool.query(
      "SELECT avatar_public_id FROM perfiles WHERE id = $1",
      [req.user.id],
    );

    for (const ent of entidades) {
      // Delete all multimedia cloudinary images for this entity
      const { rows: mm } = await pool.query(
        "SELECT public_id, url_recurso FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL",
        [ent.id],
      );
      for (const m of mm) {
        try {
          await cloudinary.v2.uploader.destroy(m.public_id);
        } catch {}
      }

      // Delete the entity's portada image from cloudinary
      if (ent.imagen) {
        const publicId = extractPublicId(ent.imagen);
        if (publicId) {
          try {
            await cloudinary.v2.uploader.destroy(publicId);
          } catch {}
        }
      }
    }

    // Delete all entities (cascades to multimedia, conexiones, pasos_recorrido, etc.)
    if (entidades.length > 0) {
      const ids = entidades.map((e) => e.id);
      await pool.query("DELETE FROM entidades WHERE id = ANY($1)", [ids]);
    }

    // Delete avatar from Cloudinary
    if (perfilData[0]?.avatar_public_id) {
      try {
        await cloudinary.v2.uploader.destroy(perfilData[0].avatar_public_id);
      } catch {}
    }

    // Delete profile (cascades to favoritos, notificaciones)
    await pool.query("DELETE FROM perfiles WHERE id = $1", [req.user.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete perfil error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
