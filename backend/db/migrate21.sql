-- Made in Chaco — Migración 21: Gamificación (puntos + logros + ranking)
-- Ejecutar: psql -U postgres -d made_in_chaco -f migrate21.sql

-- Agregar columna de puntos a sellos_coleccion
ALTER TABLE sellos_coleccion ADD COLUMN IF NOT EXISTS puntos INTEGER DEFAULT 0;

-- Tabla de logros disponibles del sistema
CREATE TABLE IF NOT EXISTS logros (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  icono VARCHAR(10) DEFAULT '✦',
  tipo VARCHAR(30) NOT NULL DEFAULT 'general',
  requisito_min INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de logros desbloqueados por usuario
CREATE TABLE IF NOT EXISTS logros_usuario (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  logro_id INTEGER NOT NULL REFERENCES logros(id) ON DELETE CASCADE,
  desbloqueado_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (perfil_id, logro_id)
);

CREATE INDEX IF NOT EXISTS idx_logros_usuario_perfil ON logros_usuario(perfil_id);
CREATE INDEX IF NOT EXISTS idx_logros_usuario_logro ON logros_usuario(logro_id);

-- Insertar logros base
INSERT INTO logros (codigo, nombre, descripcion, icono, tipo, requisito_min) VALUES
  ('primer_sello', 'Primer sello', 'Coleccionaste tu primer sello', '🎯', 'general', 1),
  ('explorador', 'Explorador', 'Coleccionaste 5 sellos', '🧭', 'general', 5),
  ('viajero', 'Viajero', 'Coleccionaste 15 sellos', '🗺️', 'general', 15),
  ('guardian_del_chaco', 'Guardián del Chaco', 'Coleccionaste 30 sellos', '🛡️', 'general', 30),
  ('coleccionista', 'Coleccionista', 'Coleccionaste 50 sellos', '💎', 'general', 50),
  ('maestro', 'Maestro', 'Coleccionaste 100 sellos', '👑', 'general', 100),
  ('gastronomico', 'Gastronómico', 'Todos los sellos de gastronomía', '🍽️', 'categoria', 0),
  ('artesanal', 'Artesanal', 'Todos los sellos de artesanos', '🪡', 'categoria', 0),
  ('naturalista', 'Naturalista', 'Todos los sellos de lugar natural', '🌿', 'categoria', 0),
  ('patrimonio_vivo', 'Patrimonio Vivo', 'Todos los sellos de patrimonio', '🏛️', 'categoria', 0),
  ('recorridor_chaco', 'Recorridor del Chaco', 'Sellos de 5 departamentos distintos', '🚜', 'departamento', 5),
  ('conocedor_del_chaco', 'Conocedor del Chaco', 'Sellos de 10 departamentos distintos', '🌎', 'departamento', 10),
  ('hijo_del_chaco', 'Hijo del Chaco', 'Sellos de todos los departamentos', '❤️', 'departamento', 25)
ON CONFLICT (codigo) DO NOTHING;
