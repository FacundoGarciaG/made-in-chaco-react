-- Made in Chaco — Migración 19: Capas Históricas
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS capas_historicas (
  id SERIAL PRIMARY KEY,
  capa VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  año_desde INTEGER NOT NULL DEFAULT 0,
  año_hasta INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(7) DEFAULT '#863819',
  geom geometry(Geometry, 4326)
);

CREATE INDEX IF NOT EXISTS idx_capas_historicas_capa ON capas_historicas(capa);

-- =============================================================
-- SEED DATA: REDUCCIONES JESUÍTICAS (puntos)
-- =============================================================
INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom) VALUES
('reduccion', 'San Fernando del Río Negro',
 'Fundada en 1750 por los jesuitas sobre el río Negro. Fue el origen de la actual ciudad de Resistencia. Destruida en 1767 tras la expulsión de la Compañía de Jesús.',
 1750, 1767, '#B8860B',
 ST_SetSRID(ST_MakePoint(-58.987, -27.451), 4326)),

('reduccion', 'San Bernardo de Vértiz',
 'Reducción jesuítica fundada en 1740 para los indígenas mocovíes. Estuvo ubicada al sur del actual territorio chaqueño.',
 1740, 1767, '#B8860B',
 ST_SetSRID(ST_MakePoint(-59.200, -27.500), 4326)),

('reduccion', 'San Pedro',
 'Misión fundada por los jesuitas para los abipones. Funcionó hasta la expulsión de 1767. Su ubicación exacta es debatida.',
 1760, 1767, '#B8860B',
 ST_SetSRID(ST_MakePoint(-59.500, -26.800), 4326)),

('reduccion', 'San Javier',
 'Reducción fundada por los jesuitas en 1743 para los mocovíes. Originalmente cerca del río San Javier, en la frontera con Santa Fe.',
 1743, 1767, '#B8860B',
 ST_SetSRID(ST_MakePoint(-59.500, -28.000), 4326)),

('reduccion', 'Nuestra Señora del Pilar',
 'Reducción fundada en 1749 para los indígenas guaycurúes. Fue una de las últimas misiones jesuíticas en la región.',
 1749, 1767, '#B8860B',
 ST_SetSRID(ST_MakePoint(-58.800, -27.300), 4326));

-- =============================================================
-- SEED DATA: FORTINES HISTÓRICOS (puntos)
-- =============================================================
INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom) VALUES
('fortin', 'Fortín Lavalle',
 'Establecido en 1879 durante la Conquista del Chaco. Uno de los fortines más importantes, dio origen a la localidad de Fortín Lavalle.',
 1879, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-59.400, -26.400), 4326)),

('fortin', 'Fortín Arenales',
 'Fundado en 1884 por el coronel José Arenales durante la campaña militar. Punto clave en el avance de la frontera norte.',
 1884, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-60.000, -26.000), 4326)),

('fortin', 'Fortín General Belgrano',
 'Fortín establecido en 1880 en el centro-oeste chaqueño. Formó parte de la línea de fortines que avanzó hacia el Bermejo.',
 1880, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-60.500, -25.800), 4326)),

('fortin', 'Fortín Fontana',
 'Fundado en 1885 por el coronel Fontana. Cumplió funciones defensivas y logísticas durante la conquista del territorio.',
 1885, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-60.300, -25.800), 4326)),

('fortin', 'Fortín La Viuda',
 'Fortín establecido en 1880 como parte de la línea defensiva avanzada. Testigo de los combates entre el ejército y los pueblos originarios.',
 1880, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-59.800, -26.200), 4326)),

('fortin', 'Fortín Alvear',
 'Fortín fundado en 1880, ubicado en el centro chaqueño. Protegía las rutas de acceso a los fortines del norte.',
 1880, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-60.000, -26.500), 4326)),

('fortin', 'Fortín Luna',
 'Fortín establecido en 1884 en el actual departamento de General Güemes. Punto de abastecimiento y descanso de las tropas.',
 1884, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-59.900, -25.900), 4326)),

('fortin', 'Fortín Tacurú',
 'Fortín fundado en 1884 en el noroeste chaqueño, cerca del límite con Salta. Su nombre remite a los tacurúes (montículos de tierra de hormigas).',
 1884, 1910, '#8B0000',
 ST_SetSRID(ST_MakePoint(-60.400, -25.500), 4326));

-- =============================================================
-- SEED DATA: RUTAS DEL TANINO (líneas)
-- =============================================================
INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom) VALUES
('ruta_tanino', 'Ferrocarril Puerto Tirol — Monte chaqueño',
 'Tendido ferroviario privado que penetraba el monte para extraer quebracho colorado hacia las fábricas de tanino de Puerto Tirol. Operado por La Fabril Financiera.',
 1900, 1960, '#654321',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-58.940 -27.373, -59.050 -27.250, -59.150 -27.150, -59.300 -27.000, -59.450 -26.850)'), 4326)),

('ruta_tanino', 'Ferrocarril Puerto Vilelas — Monte',
 'Ramal ferroviario destinado al transporte de quebracho desde el interior del monte chaqueño hacia los puertos del Paraná.',
 1900, 1960, '#654321',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-58.907 -27.440, -59.000 -27.350, -59.150 -27.200, -59.300 -27.050, -59.500 -26.880)'), 4326)),

('ruta_tanino', 'Ferrocarril La Sabana — Monte',
 'Línea férrea construida para abastecer de quebracho a la fábrica de tanino La Sabana. Atravesaba el centro chaqueño.',
 1910, 1960, '#654321',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-59.050 -27.050, -59.200 -26.900, -59.350 -26.750, -59.550 -26.580)'), 4326));

-- =============================================================
-- SEED DATA: RUTAS DEL ALGODÓN (líneas)
-- =============================================================
INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom) VALUES
('ruta_algodon', 'Ferrocarril Barranqueras — Colonia Algodonera',
 'Ramal ferroviario que conectaba las colonias algodoneras del centro chaqueño con el puerto de Barranqueras para la exportación de fibra de algodón.',
 1920, 1980, '#C8A951',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-58.929 -27.486, -59.050 -27.400, -59.200 -27.250, -59.400 -27.100, -59.600 -26.950)'), 4326)),

('ruta_algodon', 'Ferrocarril Puerto Vilelas — Zona Algodonera',
 'Tendido ferroviario que transportaba algodón desde las colonias del sudoeste chaqueño hasta los desmotadores de Puerto Vilelas.',
 1920, 1980, '#C8A951',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-58.907 -27.440, -59.100 -27.300, -59.250 -27.150, -59.350 -27.000, -59.500 -26.800)'), 4326)),

('ruta_algodon', 'Ferrocarril Central Norte — Ramal Algodonero',
 'Ramal del Ferrocarril Central Norte que atravesaba las principales zonas algodoneras de la provincia. Conectaba múltiples colonias con los puertos fluviales.',
 1920, 1980, '#C8A951',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-59.000 -27.500, -59.200 -27.350, -59.500 -27.200, -59.800 -27.000, -60.000 -26.800, -60.200 -26.600)'), 4326));

-- =============================================================
-- SEED DATA: TERRITORIOS ORIGINARIOS (polígonos)
-- =============================================================
INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom) VALUES
('territorio', 'Territorio Qom (Tobas)',
 'Territorio ancestral del pueblo Qom. Ocupaban el centro y este de la provincia del Chaco, desde el río Bermejo hasta los bañados del Paraná. Semisedentarios, combinaban la caza, pesca y recolección con una agricultura estacional.',
 1500, 1900, '#8B4513',
 ST_SetSRID(ST_GeomFromText('POLYGON((-61.500 -24.800, -58.500 -24.800, -58.200 -25.500, -58.000 -26.500, -58.000 -27.500, -58.500 -28.000, -60.000 -28.000, -61.500 -27.500, -61.500 -24.800))'), 4326)),

('territorio', 'Territorio Wichí',
 'Territorio ancestral del pueblo Wichí (antes llamados matacos). Habitaban el oeste de la provincia del Chaco, en la región del Impenetrable y el río Bermejo. Recolectores y cazadores, con una profunda relación con el monte chaqueño.',
 1500, 1900, '#2E7D32',
 ST_SetSRID(ST_GeomFromText('POLYGON((-63.000 -24.500, -61.000 -24.500, -60.500 -25.500, -61.000 -26.500, -62.000 -26.500, -63.000 -26.000, -63.000 -24.500))'), 4326)),

('territorio', 'Territorio Mocoví',
 'Territorio ancestral del pueblo Mocoví. Ocupaban el sur de la provincia del Chaco y el norte de Santa Fe. Guerreros y hábiles jinetes, comerciaban con las colonias españolas y resistieron el avance colonial durante siglos.',
 1500, 1900, '#1565C0',
 ST_SetSRID(ST_GeomFromText('POLYGON((-61.500 -27.500, -58.500 -28.000, -58.200 -28.500, -58.500 -29.000, -60.000 -29.000, -61.500 -28.500, -61.500 -27.500))'), 4326));
