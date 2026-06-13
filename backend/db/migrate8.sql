CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  entidad_id INTEGER REFERENCES entidades(id) ON DELETE SET NULL,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_perfil ON notificaciones(perfil_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(perfil_id, leida);
