-- Add banned column to perfiles table
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS baneado BOOLEAN DEFAULT false;
