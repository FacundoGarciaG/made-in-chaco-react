-- Made in Chaco — Migración 15: Soft delete para perfiles
-- Ejecutar en el SQL Editor de Supabase
--
-- Agrega columna deleted_at para papelera de 30 días antes del purge definitivo.

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_perfiles_deleted_at ON perfiles(deleted_at);
