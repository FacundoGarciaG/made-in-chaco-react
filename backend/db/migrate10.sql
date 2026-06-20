-- Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS planes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  duracion_dias INTEGER NOT NULL,
  entidades_incluidas INTEGER DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Historial de pagos/suscripciones
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES planes(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50) DEFAULT 'simulado',
  estado VARCHAR(50) DEFAULT 'aprobado',
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_pagos_perfil ON pagos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_pagos_entidad ON pagos(entidad_id);

-- Seed de planes por defecto
INSERT INTO planes (nombre, descripcion, precio, duracion_dias, entidades_incluidas, activo)
SELECT * FROM (VALUES
  ('Mensual', '30 días de visibilidad en el mapa para tu comercio, hospedaje, producto o evento.', 5000, 30, 1, true),
  ('Trimestral', '90 días de visibilidad con un descuento del 15%.', 12000, 90, 1, true),
  ('Anual', 'Un año entero de visibilidad con el mejor descuento. Ahorrá un 30%.', 38000, 365, 1, true),
  ('Anual +3', 'Tres entidades publicadas por un año al mejor precio.', 80000, 365, 3, true),
  ('Personalizado', 'Suscripción personalizada por cantidad de días.', 200, 1, 1, false)
) AS p(nombre, descripcion, precio, duracion_dias, entidades_incluidas, activo)
WHERE NOT EXISTS (SELECT 1 FROM planes LIMIT 1);
