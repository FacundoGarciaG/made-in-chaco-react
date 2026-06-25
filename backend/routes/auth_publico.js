import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { getIO } from "../services/socket.js";
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
    const { email, password, nombre, whatsapp } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await pool.query(
      "SELECT id FROM perfiles WHERE email = $1 AND deleted_at IS NULL",
      [email],
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const result = await pool.query(
      "INSERT INTO perfiles (email, password, nombre, verification_token, whatsapp) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nombre, created_at",
      [email, hashed, nombre || "", verificationToken, whatsapp || ""],
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
      "SELECT id, email, password, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, verified, baneado, whatsapp, deleted_at FROM perfiles WHERE email = $1",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const perfil = rows[0];

    if (perfil.baneado) {
      return res.status(403).json({ error: "Tu cuenta ha sido suspendida. Contactá al administrador." });
    }

    if (perfil.deleted_at) {
      return res.status(403).json({
        error: "Esta cuenta fue eliminada. Podés restaurarla dentro de 30 días.",
        codigo: "cuenta_eliminada",
        deleted_at: perfil.deleted_at,
      });
    }

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
        whatsapp: perfil.whatsapp,
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
      "SELECT id, email, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, google_id, verified, created_at, whatsapp FROM perfiles WHERE id = $1",
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
    const { nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, whatsapp } = req.body;

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
        whatsapp = COALESCE($12, whatsapp),
        updated_at = NOW()
      WHERE id = $13
      RETURNING id, email, nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, verified, created_at, whatsapp`,
      [nombre, avatar_url, profesion, bio, localidad, pais, provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id, whatsapp, req.user.id],
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
      "SELECT id, email, nombre FROM perfiles WHERE id = $1 AND deleted_at IS NULL",
      [req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const perfil = rows[0];

    // Soft delete: marca el perfil como eliminado
    await pool.query(
      "UPDATE perfiles SET deleted_at = NOW() WHERE id = $1",
      [req.user.id],
    );

    getIO()?.emit("entidad:change");

    // Notificar al usuario por email
    const restoreLink = `${SITE_URL}/iniciar-sesion`;
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || "noreply@madeinchaco.com",
        to: perfil.email,
        subject: "Made in Chaco — Eliminación de cuenta",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#863819;margin:0 0 8px">Qué lástima que nos dejes de elegir</h2>
            <p style="color:#555;margin:0 0 16px;font-size:14px">
              Hola ${perfil.nombre || ""}, lamentamos ver que eliminaste tu cuenta en Made in Chaco.
            </p>
            <p style="color:#555;margin:0 0 16px;font-size:14px">
              Tus entidades ya no se muestran en el mapa, pero no todo está perdido. Te damos <strong>30 días</strong> para que puedas revertir esta decisión. Pasado ese tiempo, los datos se eliminarán de forma permanente.
            </p>
            <p style="color:#555;margin:0 0 20px;font-size:14px">
              Si fue un error o simplemente cambiaste de opinión, podés restaurar tu cuenta iniciando sesión:
            </p>
            <a href="${restoreLink}" style="display:inline-block;padding:12px 28px;background:#863819;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Restaurar mi cuenta</a>
            <p style="color:#aaa;font-size:12px;margin-top:20px">O copiá este enlace:<br>${restoreLink}</p>
            <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
              Gracias por haber sido parte de Made in Chaco. Siempre vas a ser bienvenido.
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Email de eliminación no enviado:", mailErr.message);
    }

    res.json({ ok: true, message: "Cuenta marcada para eliminación. Tenés 30 días para restaurarla." });
  } catch (err) {
    console.error("Delete perfil error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Restaurar perfil dentro del período de gracia de 30 días (público, con email + password)
router.post("/auth/restaurar", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const { rows } = await pool.query(
      "SELECT id, password, deleted_at FROM perfiles WHERE email = $1",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const perfil = rows[0];

    if (!perfil.deleted_at) {
      return res.status(400).json({ error: "Esta cuenta no está eliminada." });
    }

    if (!perfil.password) {
      return res.status(400).json({ error: "Esta cuenta usa Google Sign-In. No se puede restaurar automáticamente." });
    }

    const valid = await bcrypt.compare(password, perfil.password);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    await pool.query(
      "UPDATE perfiles SET deleted_at = NULL WHERE id = $1",
      [perfil.id],
    );

    getIO()?.emit("entidad:change");

    // Notificar al usuario por email
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || "noreply@madeinchaco.com",
        to: email,
        subject: "Made in Chaco — Gracias por volver",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#863819;margin:0 0 8px">¡Gracias por volver!</h2>
            <p style="color:#555;margin:0 0 16px;font-size:14px">
              Nos alegra que hayas decidido quedarte. Tu cuenta de Made in Chaco fue restaurada exitosamente.
            </p>
            <p style="color:#555;margin:0 0 16px;font-size:14px">
              Tus entidades vuelven a estar visibles en el mapa y todo está como lo dejaste.
            </p>
            <p style="color:#555;margin:0 0 20px;font-size:14px">
              Ya podés iniciar sesión con tu email y contraseña para gestionar tu perfil y contenido.
            </p>
            <a href="${SITE_URL}/iniciar-sesion" style="display:inline-block;padding:12px 28px;background:#863819;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Iniciar sesión</a>
            <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px">
              Gracias por seguir formando parte de esta comunidad.
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Email de restauración no enviado:", mailErr.message);
    }

    res.json({ ok: true, message: "Cuenta restaurada exitosamente. Ya podés iniciar sesión." });
  } catch (err) {
    console.error("Restaurar perfil error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// ============================================================
// Restablecimiento de contraseña (Olvidé mi contraseña)
// ============================================================

// POST /auth/olvide-password — enviar email con link de restablecimiento
router.post("/auth/olvide-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    // Siempre responder igual por seguridad (no revelar si el email existe)
    const mensaje = "Si el email está registrado, vas a recibir un link para restablecer tu contraseña.";

    // Verificar que el email exista y esté activo
    const { rows } = await pool.query(
      "SELECT id, nombre, deleted_at FROM perfiles WHERE email = $1",
      [email],
    );

    if (rows.length === 0 || rows[0].deleted_at) {
      return res.json({ ok: true, message: mensaje });
    }

    const perfil = rows[0];

    // Rate limiting: evitar spam (1 token cada 5 minutos)
    const { rows: tokensRecientes } = await pool.query(
      "SELECT id FROM perfiles WHERE id = $1 AND reset_token_expires > NOW() - INTERVAL '5 minutes'",
      [perfil.id],
    );
    if (tokensRecientes.length > 0) {
      return res.json({ ok: true, message: mensaje });
    }

    // Generar token criptográficamente seguro (64 caracteres hex)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      "UPDATE perfiles SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expires, perfil.id],
    );

    // Enviar email
    const resetLink = `${SITE_URL}/reestablecer-contrasena/${token}`;
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || "noreply@madeinchaco.com",
        to: email,
        subject: "Made in Chaco — Restablecer contraseña",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#863819;margin:0 0 8px">Restablecé tu contraseña</h2>
            <p style="color:#555;margin:0 0 16px;font-size:14px">
              Hola ${perfil.nombre || ""}, recibimos una solicitud para restablecer la contraseña de tu cuenta en Made in Chaco.
            </p>
            <p style="color:#555;margin:0 0 20px;font-size:14px">
              Hacé clic en el siguiente botón para crear una nueva contraseña. Este link es válido por <strong>1 hora</strong>.
            </p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#863819;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Restablecer contraseña</a>
            <p style="color:#888;font-size:12px;margin-top:20px">
              Si no solicitaste este cambio, podés ignorar este mensaje.
            </p>
            <p style="color:#aaa;font-size:12px">O copiá este enlace:<br>${resetLink}</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Email de restablecimiento no enviado:", mailErr.message);
    }

    res.json({ ok: true, message: mensaje });
  } catch (err) {
    console.error("Olvide password error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// POST /auth/reestablecer-password — validar token y cambiar contraseña
router.post("/auth/reestablecer-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token y contraseña requeridos" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Buscar perfil con token válido y no expirado
    const { rows } = await pool.query(
      "SELECT id FROM perfiles WHERE reset_token = $1 AND reset_token_expires > NOW() AND deleted_at IS NULL",
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "El link es inválido o expiró. Solicitá uno nuevo." });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Actualizar contraseña y limpiar token (single-use)
    await pool.query(
      "UPDATE perfiles SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2",
      [hashed, rows[0].id],
    );

    res.json({ ok: true, message: "Contraseña actualizada exitosamente. Ya podés iniciar sesión." });
  } catch (err) {
    console.error("Reestablecer password error:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
