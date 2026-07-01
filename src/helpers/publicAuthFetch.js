export async function publicAuthFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    localStorage.removeItem("made_in_chaco_token_publico");
    localStorage.removeItem("made_in_chaco_perfil");
    window.location.href = "/iniciar-sesion";
    throw new Error("Sesión expirada");
  }
  return res;
}
