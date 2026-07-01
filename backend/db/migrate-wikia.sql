-- Migration: Expandir palabras_chaco → Wikia Chaqueña
-- Ejecutar con psql (conexión directa, no via pgBouncer):
--   psql -h HOST -p 5432 -U USER -d DB -f migrate-wikia.sql

-- 1. Agregar columnas (slug sin UNIQUE para poder generar slugs sin conflicto)
ALTER TABLE palabras_chaco
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS etimologia TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS idioma_origen VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS ejemplos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500) DEFAULT '',
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'palabra',
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Generar slugs
UPDATE palabras_chaco
SET slug = lower(regexp_replace(trim(palabra), '[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ ]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- 3. Espacios → guiones
UPDATE palabras_chaco
SET slug = regexp_replace(trim(slug), '\s+', '-', 'g')
WHERE slug ~ '\s';

-- 4. Sacar guiones al inicio/final
UPDATE palabras_chaco
SET slug = regexp_replace(slug, '^-+|-+$', '', 'g')
WHERE slug ~ '^-|-$';

-- 5. Resolver conflictos de slug agregando el id
UPDATE palabras_chaco p1
SET slug = p1.slug || '-' || p1.id
WHERE EXISTS (
  SELECT 1 FROM palabras_chaco p2
  WHERE p2.slug = p1.slug AND p2.id != p1.id
);

-- 6. Agregar UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_palabras_chaco_slug ON palabras_chaco(slug);
