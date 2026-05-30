const API_BASE = "/api";

export async function subirArchivo(file, tipoRecurso, thumbnailFile = null) {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("tipo_recurso", tipoRecurso);
  if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

  const token = localStorage.getItem("made_in_chaco_token");

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(err.error || "Error al subir archivo");
  }

  return res.json();
}

export async function subirImagen(file) {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("tipo_recurso", "foto");

  const token = localStorage.getItem("made_in_chaco_token");

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(err.error || "Error al subir imagen");
  }

  const data = await res.json();
  return data.url;
}
