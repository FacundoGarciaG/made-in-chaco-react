-- Add whatsapp column to perfiles table
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30) DEFAULT '';
