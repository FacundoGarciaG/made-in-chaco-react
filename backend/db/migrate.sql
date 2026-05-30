-- Made in Chaco — Migración para base existente
-- Ejecutar en el SQL Editor de Supabase

-- 1. Extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  geom geometry(MultiPolygon, 4326)
);

-- 3. Agregar departamento_id a localidades
ALTER TABLE localidades ADD COLUMN IF NOT EXISTS departamento_id INTEGER REFERENCES departamentos(id) ON DELETE SET NULL;

-- 4. Agregar plan_tipo a entidades
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS plan_tipo VARCHAR(50) DEFAULT 'basico';

-- 5. Índice parcial para comercios activos
DROP INDEX IF EXISTS idx_comercios_activos;
CREATE INDEX idx_comercios_activos ON entidades(plan_tipo, estado_pago) WHERE tipo = 'comercio' AND estado_pago IS NOT NULL;

-- 6. Agregar orden a multimedia
ALTER TABLE multimedia ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- 7. Agregar public_id de Cloudinary para poder borrar archivos
ALTER TABLE multimedia ADD COLUMN IF NOT EXISTS public_id VARCHAR(500);

-- 7. Unique constraint en pasos_recorrido
DROP INDEX IF EXISTS idx_pasos_recorrido_recorrido_paso;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pasos_recorrido_recorrido_paso ON pasos_recorrido(recorrido_id, paso_orden);

-- 8. Columnas faltantes para artesano (frontend compatibility)
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS anios_experiencia INTEGER;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS taller_abierto BOOLEAN DEFAULT false;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS fotos_galeria_url TEXT;

-- 9. Columna dias_abierto para comercios
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS dias_abierto VARCHAR(100);

-- 10. Asegurar que fecha_evento sea tipo DATE
ALTER TABLE entidades ALTER COLUMN fecha_evento TYPE DATE USING fecha_evento::date;

-- 11. Link a compra de entradas para eventos
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS link_entradas TEXT;

-- 12. Relación inversa para conexiones bidireccionales
ALTER TABLE conexiones ADD COLUMN IF NOT EXISTS tipo_relacion_inversa TEXT DEFAULT '';
