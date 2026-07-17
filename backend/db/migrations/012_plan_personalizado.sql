-- Plan personalizado para suscripción por días
INSERT INTO planes (nombre, descripcion, precio, duracion_dias, entidades_incluidas, activo)
SELECT 'Personalizado', 'Suscripción personalizada por cantidad de días.', 200, 1, 1, false
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'Personalizado');

-- Asegurar que el plan personalizado esté inactivo
UPDATE planes SET activo = false WHERE nombre = 'Personalizado' AND activo IS NOT false;
