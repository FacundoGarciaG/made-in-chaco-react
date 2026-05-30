const FORMATOS_PERMITIDOS = {
  foto: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
};

const EXTENSIONES_PERMITIDAS = {
  foto: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".webm"],
  audio: [".mp3", ".wav", ".ogg"],
};

const RESOLUCION_MINIMA_FOTO = { width: 1920, height: 1080 };
const RESOLUCION_MINIMA_VIDEO = { width: 1920, height: 1080 };
const FPS_MINIMO_VIDEO = 24;
const BITRATE_MINIMO_AUDIO = 192000;
const SAMPLE_RATE_MINIMO_AUDIO = 44100;

export function obtenerExtension(nombreArchivo) {
  const ext = nombreArchivo?.toLowerCase().split(".").pop();
  return ext ? `.${ext}` : "";
}

export function validarFormato(tipoRecurso, file) {
  const mimeValido = FORMATOS_PERMITIDOS[tipoRecurso]?.includes(file.type);
  const ext = obtenerExtension(file.name);
  const extValida = EXTENSIONES_PERMITIDAS[tipoRecurso]?.includes(ext);

  if (!mimeValido && !extValida) {
    const formatos = FORMATOS_PERMITIDOS[tipoRecurso]?.join(", ") || "";
    return {
      valido: false,
      error: `Formato no soportado para ${tipoRecurso}. Usá: ${formatos}`,
    };
  }

  return { valido: true };
}

export function validarResolucionFoto(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (
        img.width < RESOLUCION_MINIMA_FOTO.width ||
        img.height < RESOLUCION_MINIMA_FOTO.height
      ) {
        resolve({
          valido: false,
          error: `Resolución muy baja: ${img.width}×${img.height}. Mínimo: ${RESOLUCION_MINIMA_FOTO.width}×${RESOLUCION_MINIMA_FOTO.height} (Full HD).`,
        });
      } else {
        resolve({ valido: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valido: false,
        error: "No se pudo leer la imagen. Probá con otro archivo.",
      });
    };

    img.src = url;
  });
}

export function validarResolucionVideo(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const errores = [];

      if (
        video.videoWidth < RESOLUCION_MINIMA_VIDEO.width &&
        video.videoHeight < RESOLUCION_MINIMA_VIDEO.height
      ) {
        errores.push(
          `Resolución muy baja: ${video.videoWidth}×${video.videoHeight}. Mínimo: ${RESOLUCION_MINIMA_VIDEO.width}×${RESOLUCION_MINIMA_VIDEO.height}.`,
        );
      }

      resolve({
        valido: errores.length === 0,
        error: errores.join(" "),
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valido: false,
        error: "No se pudo leer el video. Probá con otro archivo.",
      });
    };

    video.src = url;
  });
}

export function validarAudio(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("audio/")) {
      resolve({ valido: false, error: "El archivo no es un audio válido." });
      return;
    }

    resolve({ valido: true });
  });
}

export async function validarArchivo(tipoRecurso, file) {
  const formato = validarFormato(tipoRecurso, file);
  if (!formato.valido) return formato;

  if (tipoRecurso === "foto") {
    return validarResolucionFoto(file);
  }

  if (tipoRecurso === "video") {
    return validarResolucionVideo(file);
  }

  if (tipoRecurso === "audio") {
    return validarAudio(file);
  }

  return { valido: true };
}

export const INFO_FORMATOS = {
  foto: {
    label: "Foto",
    formatos: "JPG, PNG, WebP",
    resolucion: "1920×1080 (Full HD) mín.",
    icono: "📷",
  },
  video: {
    label: "Video",
    formatos: "MP4 (H.264), WebM (VP9)",
    resolucion: "1920×1080 (Full HD) mín.",
    icono: "🎥",
  },
  audio: {
    label: "Audio",
    formatos: "MP3, WAV, OGG",
    resolucion: "192 kbps / 44.1 kHz recomendado",
    icono: "🎵",
  },
};
