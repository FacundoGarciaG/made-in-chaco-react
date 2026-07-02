import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getValidToken() {
  const token = localStorage.getItem("made_in_chaco_token")
    || localStorage.getItem("made_in_chaco_token_publico");
  if (token && isTokenExpired(token)) {
    localStorage.removeItem("made_in_chaco_token");
    localStorage.removeItem("made_in_chaco_token_publico");
    localStorage.removeItem("made_in_chaco_perfil");
    return null;
  }
  return token;
}

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: false,
  reconnectionDelayMax: 10000,
});

socket.on("connect", () => {
  console.log("⚡ Socket conectado:", socket.id);
  const token = getValidToken();
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

  const t = token !== undefined ? token : getValidToken();
  socket.auth = { token: t };
  if (!t) return socket;
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
