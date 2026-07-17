-- Add custom icon column to entidades table for user-uploaded 24x24 PNG icons
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS icono VARCHAR(500);
