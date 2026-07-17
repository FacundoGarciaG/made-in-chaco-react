CREATE TABLE IF NOT EXISTS site_config (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_config (key, value) VALUES
  ('entidad_dia_modo', '"auto"'),
  ('entidad_dia_entidad_id', 'null')
ON CONFLICT (key) DO NOTHING;
