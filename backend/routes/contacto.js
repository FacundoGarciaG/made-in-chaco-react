import { Router } from "express";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { contactoRules, sanitizarHtml } from "../middleware/validation.js";
import { logger } from "../config/logger.js";

const router = Router();

const mailReady =
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS;

let transporter = null;
if (mailReady) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

router.post("/contacto", contactoRules, async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = sanitizarHtml(req.body);

    await pool.query(
      `INSERT INTO contacto_mensajes (nombre, email, asunto, mensaje) VALUES ($1, $2, $3, $4)`,
      [nombre, email, asunto, mensaje],
    );

    if (transporter) {
      transporter
        .sendMail({
          from: `"${nombre}" <${process.env.MAIL_USER}>`,
          replyTo: email,
          to: process.env.MAIL_USER,
          subject: `[Contacto Web] ${asunto}`,
          html: `
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Asunto:</strong> ${asunto}</p>
            <hr>
            <p>${mensaje.replace(/\n/g, "<br>")}</p>
          `,
        })
        .catch((e) => logger.warn("Mail no enviado:", e.message));
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al enviar mensaje de contacto:", err);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

export default router;
