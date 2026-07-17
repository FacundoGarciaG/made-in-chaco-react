-- Made in Chaco — Migración 2: Analytics
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  entidad_id INT REFERENCES entidades(id) ON DELETE CASCADE,
  slug VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existe, migrar la FK existente (SET NULL) a CASCADE
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_entidad_id_fkey;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_entidad_id_fkey
  FOREIGN KEY (entidad_id) REFERENCES entidades(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_analytics_events_tipo ON analytics_events(tipo);
CREATE INDEX IF NOT EXISTS idx_analytics_events_entidad_id ON analytics_events(entidad_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tipo_created ON analytics_events(tipo, created_at);
