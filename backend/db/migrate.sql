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

-- 13. Nuevos tipos de entidad: comunidad_indigena
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS etnia VARCHAR(255);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS lenguas TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS territorio_tradicional TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS cosmovision TEXT;

-- 14. Nuevos tipos de entidad: lugar_natural
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS categoria_natural VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS actividades TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS acceso TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS flora_fauna_destacada TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS mejor_epoca VARCHAR(255);

-- 15. Nuevos tipos de entidad: hospedaje
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS categoria_hospedaje VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS servicios TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS capacidad VARCHAR(100);

-- 16. Nuevos tipos de entidad: productor
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(255);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS metodos_produccion TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS certificaciones TEXT;

-- 17. Nuevos tipos de entidad: experiencia
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS tipo_experiencia VARCHAR(255);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS duracion_experiencia VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS que_incluye TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS precio_referencia VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS contacto_reserva TEXT;
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS operador VARCHAR(255);

-- 18. Nuevos tipos de entidad: relato
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS autor VARCHAR(255);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS fecha_relato VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS tipo_relato VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS contenido_completo TEXT;

-- 19. Nuevos tipos de entidad: espacio_cultural
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS tipo_espacio VARCHAR(100);
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS horarios VARCHAR(255);

-- 20. Estado del sello para solicitudes públicas
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS estado_sello VARCHAR(20) DEFAULT NULL;

-- 21. Email de contacto obligatorio para todas las entidades
ALTER TABLE entidades ADD COLUMN IF NOT EXISTS email VARCHAR(255);
