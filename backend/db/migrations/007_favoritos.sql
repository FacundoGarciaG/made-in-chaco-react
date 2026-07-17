-- Create favoritos table for user favorites (entities and recorridos)
CREATE TABLE IF NOT EXISTS favoritos (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  entidad_id INTEGER REFERENCES entidades(id) ON DELETE CASCADE,
  recorrido_id INTEGER REFERENCES recorridos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT at_least_one_target CHECK (
    entidad_id IS NOT NULL OR recorrido_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_favoritos_perfil_id ON favoritos(perfil_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_favoritos_perfil_entidad ON favoritos(perfil_id, entidad_id) WHERE entidad_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_favoritos_perfil_recorrido ON favoritos(perfil_id, recorrido_id) WHERE recorrido_id IS NOT NULL;
