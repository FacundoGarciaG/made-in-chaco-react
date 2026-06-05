-- =============================================
-- RLS — Row Level Security
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE localidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conexiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorridos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pasos_recorrido ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacto_mensajes ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para el rol anon (público)
-- Entidades: solo lectura, solo visibles
CREATE POLICY "entidades_select_public" ON entidades
  FOR SELECT USING (visible = true);

-- Localidades: solo lectura
CREATE POLICY "localidades_select_public" ON localidades
  FOR SELECT USING (true);

-- Departamentos: solo lectura
CREATE POLICY "departamentos_select_public" ON departamentos
  FOR SELECT USING (true);

-- Multimedia: solo lectura para entidades visibles
CREATE POLICY "multimedia_select_public" ON multimedia
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM entidades WHERE id = multimedia.entidad_id AND visible = true)
  );

-- Conexiones: solo lectura
CREATE POLICY "conexiones_select_public" ON conexiones
  FOR SELECT USING (true);

-- Recorridos: solo lectura
CREATE POLICY "recorridos_select_public" ON recorridos
  FOR SELECT USING (true);

-- Pasos recorrido: solo lectura
CREATE POLICY "pasos_recorrido_select_public" ON pasos_recorrido
  FOR SELECT USING (true);

-- 3. Políticas para el rol authenticated (admin)
-- Los admins se autentican via Express, no via Supabase Auth,
-- asi que esto solo aplica si usas Supabase Auth algun dia.
-- Por ahora, denegar todo por defecto (excepto SELECT publico arriba).
-- Los INSERT/UPDATE/DELETE se hacen via conexion directa (pg) que bypassa RLS.

-- 4. Política para contacto_mensajes: permitir INSERT publico
CREATE POLICY "contacto_mensajes_insert_public" ON contacto_mensajes
  FOR INSERT WITH CHECK (true);

-- 5. Denegar INSERT/UPDATE/DELETE al rol anon en todas las tablas
CREATE POLICY "entidades_insert_deny" ON entidades FOR INSERT WITH CHECK (false);
CREATE POLICY "entidades_update_deny" ON entidades FOR UPDATE USING (false);
CREATE POLICY "entidades_delete_deny" ON entidades FOR DELETE USING (false);

CREATE POLICY "localidades_insert_deny" ON localidades FOR INSERT WITH CHECK (false);
CREATE POLICY "localidades_update_deny" ON localidades FOR UPDATE USING (false);
CREATE POLICY "localidades_delete_deny" ON localidades FOR DELETE USING (false);

CREATE POLICY "multimedia_insert_deny" ON multimedia FOR INSERT WITH CHECK (false);
CREATE POLICY "multimedia_update_deny" ON multimedia FOR UPDATE USING (false);
CREATE POLICY "multimedia_delete_deny" ON multimedia FOR DELETE USING (false);

CREATE POLICY "conexiones_insert_deny" ON conexiones FOR INSERT WITH CHECK (false);
CREATE POLICY "conexiones_update_deny" ON conexiones FOR UPDATE USING (false);
CREATE POLICY "conexiones_delete_deny" ON conexiones FOR DELETE USING (false);
