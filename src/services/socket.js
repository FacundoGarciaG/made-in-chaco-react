import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: false,
});

socket.on("connect", () => {
  console.log("⚡ Socket conectado:", socket.id);
  const token = localStorage.getItem("made_in_chaco_token")
    || localStorage.getItem("made_in_chaco_token_publico");
  if (token) {
    socket.emit("authenticate", token);
  }
});

socket.on("disconnect", (reason) => {
  console.log("⚡ Socket desconectado:", reason);
});

socket.on("connect_error", (err) => {
  console.warn("⚡ Error de conexión socket:", err.message);
});

export function connectSocket(token) {
  if (token === undefined && socket.connected) return socket;

  const t = token !== undefined ? token : (localStorage.getItem("made_in_chaco_token")
    || localStorage.getItem("made_in_chaco_token_publico"));
  socket.auth = { token: t };
  if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  socket.disconnect();
}

export function authenticateSocket(token) {
  if (socket.connected) {
    socket.emit("authenticate", token);
  }
}

export { socket };
