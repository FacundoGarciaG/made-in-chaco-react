-- Made in Chaco — Esquema PostgreSQL
-- Ejecutar: psql -U postgres -d made_in_chaco -f schema.sql
-- O pegar en el SQL Editor de Supabase

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  geom geometry(MultiPolygon, 4326)
);

CREATE TABLE IF NOT EXISTS localidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  departamento_id INTEGER REFERENCES departamentos(id) ON DELETE SET NULL,
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  departamento VARCHAR(200),
  habitantes INTEGER,
  fecha_fundacion VARCHAR(50),
  gentilicio VARCHAR(100),
  es_cabecera BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS entidades (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  resumen TEXT,
  localidad_id INTEGER REFERENCES localidades(id) ON DELETE SET NULL,
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  imagen VARCHAR(500),
  visible BOOLEAN DEFAULT true,
  biografia_larga TEXT,

  -- artesano
  tecnica_principal VARCHAR(255),
  materiales_usados TEXT,
  comunidad_etnica VARCHAR(255),
  contacto_comercial TEXT,

  -- artesano extras (added for frontend compatibility)
  anios_experiencia INTEGER,
  taller_abierto BOOLEAN DEFAULT false,
  fotos_galeria_url TEXT,

  -- comercio
  razon_social VARCHAR(255),
  cuit VARCHAR(20),
  rubro_especifico VARCHAR(255),
  direccion_escrita TEXT,
  sitio_web VARCHAR(500),
  horario_apertura VARCHAR(50),
  horario_cierre VARCHAR(50),
  dias_abierto VARCHAR(100),
  redes_sociales VARCHAR(500),
  acepta_tarjetas BOOLEAN DEFAULT false,
  plan_tipo VARCHAR(50) DEFAULT 'basico',
  fecha_inicio_suscripcion DATE,
  fecha_fin_suscripcion DATE,
  estado_pago VARCHAR(50),

  -- evento
  fecha_evento DATE,
  duracion_dias INTEGER,
  actividades_principales TEXT,
  es_itinerante BOOLEAN DEFAULT false,
  link_entradas TEXT,

  -- gastronomia
  historia_plato TEXT,
  ingredientes_clave TEXT,
  receta_destacada TEXT,
  establecimientos_donde_probar TEXT,

  -- personalidad
  nombre_completo VARCHAR(255),
  apodo VARCHAR(255),
  biografia_resumida TEXT,
  profesion VARCHAR(255),
  fecha_nacimiento VARCHAR(50),
  foto_perfil_url VARCHAR(500),
  es_referente_comunidad BOOLEAN DEFAULT false,
  contacto TEXT,

  -- patrimonio
  año_referencia VARCHAR(50),
  estilo_arquitectonico VARCHAR(255),
  declaratoria_oficial TEXT,
  estado_conservacion VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON entidades(tipo);
CREATE INDEX IF NOT EXISTS idx_entidades_slug ON entidades(slug);
CREATE INDEX IF NOT EXISTS idx_entidades_visible ON entidades(visible);
CREATE INDEX IF NOT EXISTS idx_comercios_activos ON entidades(plan_tipo, estado_pago) WHERE tipo = 'comercio' AND estado_pago IS NOT NULL;

CREATE TABLE IF NOT EXISTS multimedia (
  id SERIAL PRIMARY KEY,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  url_recurso VARCHAR(500) NOT NULL,
  titulo_alternativo VARCHAR(255),
  descripcion_recurso TEXT,
  tipo_recurso VARCHAR(20) NOT NULL DEFAULT 'foto',
  es_principal BOOLEAN DEFAULT false,
  orden INTEGER DEFAULT 0,
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multimedia_entidad ON multimedia(entidad_id);

CREATE TABLE IF NOT EXISTS conexiones (
  id SERIAL PRIMARY KEY,
  entidad_origen_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  entidad_destino_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  tipo_relacion VARCHAR(100),
  tipo_relacion_inversa TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_conexiones_origen ON conexiones(entidad_origen_id);
CREATE INDEX IF NOT EXISTS idx_conexiones_destino ON conexiones(entidad_destino_id);

CREATE TABLE IF NOT EXISTS recorridos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  imagen VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pasos_recorrido (
  id SERIAL PRIMARY KEY,
  recorrido_id INTEGER NOT NULL REFERENCES recorridos(id) ON DELETE CASCADE,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  descripcion_paso TEXT,
  paso_orden INTEGER NOT NULL DEFAULT 0,
  UNIQUE (recorrido_id, paso_orden)
);

CREATE INDEX IF NOT EXISTS idx_pasos_recorrido ON pasos_recorrido(recorrido_id);

-- ============ MULTIMEDIA — ETIQUETAS DE ENTIDADES ============
CREATE TABLE IF NOT EXISTS multimedia_etiquetas (
  id SERIAL PRIMARY KEY,
  multimedia_id INTEGER NOT NULL REFERENCES multimedia(id) ON DELETE CASCADE,
  entidad_id INTEGER NOT NULL REFERENCES entidades(id) ON DELETE CASCADE,
  timestamp_inicio DECIMAL(10,3),
  timestamp_fin DECIMAL(10,3),
  UNIQUE (multimedia_id, entidad_id)
);

CREATE INDEX IF NOT EXISTS idx_mulet_multimedia ON multimedia_etiquetas(multimedia_id);
CREATE INDEX IF NOT EXISTS idx_mulet_entidad ON multimedia_etiquetas(entidad_id);
