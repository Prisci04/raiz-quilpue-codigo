/* REQUIERE APLICACIÓN REMOTA. No ejecutado durante el cierre Pre-Sprint 3.
   Revisar primero en una BD local o entorno de pruebas autorizado.
   Requiere 009 + 011. No modifica Storage ni datos históricos automáticamente.
   Todo el parche se aplica o revierte como una unidad.
*/
BEGIN;

-- Detectar inconsistencias heredadas antes de añadir la constraint.
-- Inspección manual sugerida:
-- SELECT id, estado_revision, pieza_id FROM public.museo_aportes
-- WHERE (estado_revision = 'convertido') <> (pieza_id IS NOT NULL);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.museo_aportes
    WHERE (estado_revision = 'convertido') <> (pieza_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Museo: revisar estados/vinculos heredados antes de aplicar 012';
  END IF;
END;
$$;

ALTER TABLE public.museo_aportes
  DROP CONSTRAINT IF EXISTS museo_aportes_conversion_check;
ALTER TABLE public.museo_aportes
  ADD CONSTRAINT museo_aportes_conversion_check
  CHECK ((estado_revision = 'convertido') = (pieza_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_museo_aportes_pieza
  ON public.museo_aportes (pieza_id) WHERE pieza_id IS NOT NULL;

-- Mantener el estado coherente incluso si se elimina una pieza mediante SQL
-- autorizado fuera de la RPC. El trigger y el DELETE pertenecen a la misma TX.
CREATE OR REPLACE FUNCTION public.museo_restaurar_aportes_al_eliminar_pieza()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.museo_aportes
  SET estado_revision = 'pendiente', pieza_id = NULL
  WHERE pieza_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS museo_pieza_restaurar_aportes ON public.museo_piezas;
CREATE TRIGGER museo_pieza_restaurar_aportes
BEFORE DELETE ON public.museo_piezas
FOR EACH ROW EXECUTE FUNCTION public.museo_restaurar_aportes_al_eliminar_pieza();

CREATE OR REPLACE FUNCTION public.convertir_aporte_museo(p_aporte_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_aporte public.museo_aportes%ROWTYPE;
  v_pieza public.museo_piezas%ROWTYPE;
BEGIN
  SELECT * INTO v_aporte FROM public.museo_aportes
  WHERE id = p_aporte_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;
  IF v_aporte.estado_revision <> 'pendiente' OR v_aporte.pieza_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'ALREADY_PROCESSED');
  END IF;

  INSERT INTO public.museo_piezas (
    titulo, descripcion, categoria, fecha_aproximada, lugar,
    archivo_nombre, archivo_url, imagen_url, estado
  ) VALUES (
    v_aporte.titulo, v_aporte.descripcion, v_aporte.categoria,
    v_aporte.fecha_aproximada, v_aporte.lugar,
    v_aporte.archivo_nombre, v_aporte.archivo_url,
    CASE WHEN lower(v_aporte.archivo_nombre) ~ '\.(jpg|jpeg|png|webp|avif)$'
      THEN v_aporte.archivo_url ELSE NULL END,
    'borrador'
  ) RETURNING * INTO v_pieza;

  UPDATE public.museo_aportes
  SET estado_revision = 'convertido', pieza_id = v_pieza.id
  WHERE id = p_aporte_id;
  -- Cualquier excepción revierte también la pieza creada; no hay EXCEPTION que
  -- oculte fallos y confirme solo una parte de la operación.
  RETURN jsonb_build_object('pieza', to_jsonb(v_pieza));
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_pieza_museo(p_pieza_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pieza public.museo_piezas%ROWTYPE;
BEGIN
  SELECT * INTO v_pieza FROM public.museo_piezas
  WHERE id = p_pieza_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eliminado', false);
  END IF;
  -- El trigger restaura los aportes dentro de esta misma transacción.
  DELETE FROM public.museo_piezas WHERE id = p_pieza_id;
  RETURN jsonb_build_object('eliminado', true, 'pieza', to_jsonb(v_pieza));
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_aporte_museo(p_aporte_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_aporte public.museo_aportes%ROWTYPE;
  v_conservar BOOLEAN;
BEGIN
  -- Serializa eliminación y conversión del mismo aporte.
  SELECT * INTO v_aporte FROM public.museo_aportes
  WHERE id = p_aporte_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eliminado', false);
  END IF;
  v_conservar := v_aporte.pieza_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.museo_piezas
    WHERE archivo_url = v_aporte.archivo_url OR imagen_url = v_aporte.archivo_url
  ) OR EXISTS (
    SELECT 1 FROM public.museo_aportes
    WHERE id <> p_aporte_id AND archivo_url = v_aporte.archivo_url
  );
  DELETE FROM public.museo_aportes WHERE id = p_aporte_id;
  RETURN jsonb_build_object(
    'eliminado', true, 'archivo_url', v_aporte.archivo_url,
    'conservar_archivo', v_conservar
  );
END;
$$;

-- Nunca PUBLIC/anon/authenticated: la autorización de aplicación precede a RPC.
REVOKE ALL ON FUNCTION public.convertir_aporte_museo(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.eliminar_pieza_museo(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.eliminar_aporte_museo(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.museo_restaurar_aportes_al_eliminar_pieza() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convertir_aporte_museo(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_pieza_museo(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_aporte_museo(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.museo_restaurar_aportes_al_eliminar_pieza() TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
