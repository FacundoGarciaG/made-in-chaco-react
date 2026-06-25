-- Made in Chaco — Migración 14: CASCADA completa al eliminar perfil
-- Ejecutar en el SQL Editor de Supabase
--
-- Al eliminar un perfil (perfiles) se deben borrar automáticamente:
--   - Todas sus entidades → que cascaden a multimedia, conexiones,
--     pasos_recorrido, analytics_events, multimedia_etiquetas, etc.
--   - Todas sus solicitudes de edición
--   - favoritos, notificaciones (ya estaban en CASCADE)
--
-- Los pagos NO se borran (SET NULL) para conservar el historial contable.

-- entidades: pasa de SET NULL a CASCADE
ALTER TABLE entidades DROP CONSTRAINT IF EXISTS entidades_perfil_id_fkey;
ALTER TABLE entidades ADD CONSTRAINT entidades_perfil_id_fkey
  FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE;

-- solicitudes_edicion: pasa de SET NULL a CASCADE
ALTER TABLE solicitudes_edicion DROP CONSTRAINT IF EXISTS solicitudes_edicion_perfil_id_fkey;
ALTER TABLE solicitudes_edicion ADD CONSTRAINT solicitudes_edicion_perfil_id_fkey
  FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE;

-- pagos: pasa de CASCADE a SET NULL (conservar historial contable)
ALTER TABLE pagos ALTER COLUMN perfil_id DROP NOT NULL;
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_perfil_id_fkey;
ALTER TABLE pagos ADD CONSTRAINT pagos_perfil_id_fkey
  FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE SET NULL;

ALTER TABLE pagos ALTER COLUMN entidad_id DROP NOT NULL;
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_entidad_id_fkey;
ALTER TABLE pagos ADD CONSTRAINT pagos_entidad_id_fkey
  FOREIGN KEY (entidad_id) REFERENCES entidades(id) ON DELETE SET NULL;
