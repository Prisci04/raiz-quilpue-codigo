-- Ejecutar manualmente DESPUÉS de SQL 020. Solo lectura; no incluye contenido editorial.
SELECT table_name, column_name, data_type, is_nullable, column_default,
       character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('ia_configuracion', 'ia_conocimiento')
ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid IN ('public.ia_configuracion'::regclass, 'public.ia_conocimiento'::regclass);

SELECT relname, relrowsecurity, relacl FROM pg_class
WHERE oid IN ('public.ia_configuracion'::regclass, 'public.ia_conocimiento'::regclass);
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('ia_configuracion', 'ia_conocimiento');
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name IN ('ia_configuracion', 'ia_conocimiento')
ORDER BY table_name, grantee, privilege_type;
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('ia_configuracion', 'ia_conocimiento');
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table IN ('ia_configuracion', 'ia_conocimiento');
SELECT COUNT(*) AS filas_configuracion, MIN(id) AS id FROM public.ia_configuracion;
SELECT COUNT(*) AS secciones, COUNT(*) FILTER (WHERE activo) AS activas FROM public.ia_conocimiento;
