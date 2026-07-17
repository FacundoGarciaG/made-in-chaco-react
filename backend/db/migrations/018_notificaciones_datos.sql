-- Add datos column to notificaciones for storing extra data (e.g. edit diff)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB;
