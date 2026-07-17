-- Made in Chaco — Migración 20: Sellos / Gamificación QR
-- Ejecutar: psql -U postgres -d made_in_chaco -f migrate20.sql

CREATE TABLE IF NOT EXISTS sellos_coleccion (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (perfil_id, entidad_id)
);

CREATE INDEX IF NOT EXISTS idx_sellos_perfil ON sellos_coleccion(perfil_id);
CREATE INDEX IF NOT EXISTS idx_sellos_entidad ON sellos_coleccion(entidad_id);
