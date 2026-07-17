-- Add perfil_id to entidades table for associating entities with user profiles
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS perfil_id INTEGER REFERENCES perfiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_entidades_perfil_id ON entidades(perfil_id);
