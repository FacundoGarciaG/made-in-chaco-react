-- Agrega todas las columnas que puedan faltar en perfiles
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS profesion VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS localidad VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS pais VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS sexo VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_public_id VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(500) DEFAULT '';

-- Marcar como verificados los perfiles existentes antes de este cambio
UPDATE perfiles SET verified = true WHERE verified IS NULL OR verified = false;
