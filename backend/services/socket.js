import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { logger } from "../config/logger.js";
let io = null;

function getRoomFromToken(decoded) {
  const prefix = decoded.tipo === "publico" ? "perfil" : "admin";
  return `${prefix}:${decoded.id}`;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5173", "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.room = getRoomFromToken(decoded);
        return next();
      } catch (err) {
        logger.warn("⚡ Token inválido en auth:", err.message);
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    logger.info("⚡ Cliente conectado:", socket.id, socket.room ? `(sala ${socket.room})` : "(anónimo)");

    if (socket.room) {
      socket.join(socket.room);
    }

    socket.on("authenticate", (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const room = getRoomFromToken(decoded);
        socket.room = room;
        socket.join(room);
        logger.info(`⚡ Autenticado en sala ${room} (socket ${socket.id})`);
      } catch (err) {
        logger.warn("⚡ Token inválido en socket:", err.message);
      }
    });

    socket.on("disconnect", () => {
      logger.info("⚡ Cliente desconectado:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
