-- Solicitudes de conexion entre entidades de diferentes usuarios
CREATE TABLE IF NOT EXISTS solicitudes_conexion (
  id SERIAL PRIMARY KEY,
  entidad_origen_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  entidad_destino_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  tipo_relacion VARCHAR(100) DEFAULT '',
  tipo_relacion_inversa TEXT DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_conexion_origen ON solicitudes_conexion(entidad_origen_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_conexion_destino ON solicitudes_conexion(entidad_destino_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_conexion_estado ON solicitudes_conexion(estado);
