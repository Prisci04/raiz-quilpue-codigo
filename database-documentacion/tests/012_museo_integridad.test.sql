/* SOLO BD LOCAL/DE PRUEBAS autorizada, después de aplicar 012.
   No ejecutado contra Supabase. No subir archivos. Todos los fixtures se revierten.
   psql -v ON_ERROR_STOP=1 -f database-documentacion/tests/012_museo_integridad.test.sql
*/
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.rq_fail_conversion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.titulo = '__rq_fail_conversion' AND NEW.estado_revision = 'convertido' THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Fallo controlado después de crear pieza';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rq_test_fail_conversion
BEFORE UPDATE OF estado_revision ON public.museo_aportes
FOR EACH ROW EXECUTE FUNCTION pg_temp.rq_fail_conversion();

DO $$
DECLARE
  v_aporte BIGINT;
  v_pieza BIGINT;
  v_result JSONB;
  v_count BIGINT;
BEGIN
  IF has_function_privilege('anon', 'public.convertir_aporte_museo(bigint)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.eliminar_pieza_museo(bigint)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.eliminar_aporte_museo(bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC accesible por un rol no autorizado';
  END IF;
  INSERT INTO public.museo_aportes (nombre,correo,categoria,titulo,descripcion,archivo_nombre,archivo_url)
  VALUES ('Fixture local','fixture@example.com','documentos','Fixture PDF','Solo prueba local','fixture.pdf',
    'https://example.supabase.co/storage/v1/object/public/public-media/museo/aportes/12345678-1234-4123-8123-123456789abc.pdf')
  RETURNING id INTO v_aporte;

  v_result := public.convertir_aporte_museo(v_aporte);
  v_pieza := (v_result->'pieza'->>'id')::BIGINT;
  IF v_pieza IS NULL OR v_result->'pieza'->>'imagen_url' IS NOT NULL THEN
    RAISE EXCEPTION 'Conversión PDF inválida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.museo_aportes WHERE id=v_aporte AND estado_revision='convertido' AND pieza_id=v_pieza) THEN
    RAISE EXCEPTION 'Aporte no vinculado';
  END IF;
  IF public.convertir_aporte_museo(v_aporte)->>'error' <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'Conversión repetida no rechazada';
  END IF;
  PERFORM public.eliminar_pieza_museo(v_pieza);
  IF NOT EXISTS (SELECT 1 FROM public.museo_aportes WHERE id=v_aporte AND estado_revision='pendiente' AND pieza_id IS NULL AND archivo_url IS NOT NULL) THEN
    RAISE EXCEPTION 'Eliminación no restaura el aporte/archivo';
  END IF;
  IF (public.eliminar_pieza_museo(v_pieza)->>'eliminado')::BOOLEAN THEN
    RAISE EXCEPTION 'Eliminación repetida incorrecta';
  END IF;
  v_result := public.convertir_aporte_museo(v_aporte);
  v_pieza := (v_result->'pieza'->>'id')::BIGINT;
  v_result := public.eliminar_aporte_museo(v_aporte);
  IF NOT (v_result->>'conservar_archivo')::BOOLEAN
    OR NOT EXISTS (SELECT 1 FROM public.museo_piezas WHERE id=v_pieza) THEN
    RAISE EXCEPTION 'Eliminar aporte convertido afectó a pieza/archivo compartido';
  END IF;

  -- Una excepción posterior al INSERT debe revertirlo también.
  SELECT count(*) INTO v_count FROM public.museo_piezas;
  INSERT INTO public.museo_aportes (nombre,correo,categoria,titulo,descripcion,archivo_nombre)
  VALUES ('Fixture local','fixture@example.com','documentos','__rq_fail_conversion','Solo prueba local','fixture.pdf')
  RETURNING id INTO v_aporte;
  BEGIN
    PERFORM public.convertir_aporte_museo(v_aporte);
    RAISE EXCEPTION 'El trigger de fallo no se ejecutó';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  IF (SELECT count(*) FROM public.museo_piezas) <> v_count
    OR NOT EXISTS (SELECT 1 FROM public.museo_aportes WHERE id=v_aporte AND estado_revision='pendiente' AND pieza_id IS NULL) THEN
    RAISE EXCEPTION 'Rollback dejó una pieza parcial';
  END IF;
END;
$$;

ROLLBACK;
/* Concurrencia, dos sesiones de una BD de pruebas:
   A: BEGIN; SELECT public.convertir_aporte_museo(<id_fixture>); -- sin COMMIT aún
   B: SELECT public.convertir_aporte_museo(<mismo_id>); -- debe esperar
   A: COMMIT;
   B: debe obtener ALREADY_PROCESSED, sin segunda pieza.
   Repetir sustituyendo B por eliminar_aporte_museo: se conserva pieza/archivo.
*/
