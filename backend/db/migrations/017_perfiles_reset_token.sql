-- Made in Chaco — Migración 16: Restablecimiento de contraseña
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS reset_token VARCHAR(500);
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_perfiles_reset_token ON perfiles(reset_token);
