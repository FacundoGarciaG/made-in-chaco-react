-- Create solicitudes_edicion table for user edit requests
CREATE TABLE IF NOT EXISTS solicitudes_edicion (
  id SERIAL PRIMARY KEY,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  perfil_id INTEGER REFERENCES perfiles(id) ON DELETE SET NULL,
  datos JSONB NOT NULL DEFAULT '{}',
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_edicion_estado ON solicitudes_edicion(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_edicion_entidad ON solicitudes_edicion(entidad_id);
