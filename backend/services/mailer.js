import nodemailer from "nodemailer";
import { logger } from "../config/logger.js";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendEmail(to, subject, text) {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `"Made in Chaco" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
    });
  } catch (err) {
    logger.error("Error al enviar email:", err);
  }
}
