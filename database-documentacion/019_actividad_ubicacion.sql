/* HU-23 — REQUIERE APLICACIÓN REMOTA por un responsable autorizado.
   Preparado para revisión; no ejecutar automáticamente desde la aplicación.
   Definitivo Leaflet/OSM: aditivo, conserva lugar, filas históricas, RLS y permisos.
   El nombre del archivo se conserva para trazabilidad de la versión Google anterior.
*/
BEGIN;
ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(500),
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conname = 'actividades_hu23_coordenadas_check' AND conrelid = 'public.actividades'::regclass) THEN
    ALTER TABLE public.actividades ADD CONSTRAINT actividades_hu23_coordenadas_check CHECK (
      (latitud IS NULL AND longitud IS NULL) OR
      (latitud IS NOT NULL AND longitud IS NOT NULL AND latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180)
    );
  END IF;
END $$;

ALTER TABLE public.actividades
  DROP CONSTRAINT IF EXISTS actividades_direccion_check,
  DROP CONSTRAINT IF EXISTS actividades_google_place_id_check;
ALTER TABLE public.actividades
  ADD CONSTRAINT actividades_direccion_check
    CHECK (direccion IS NULL OR direccion !~ '^[[:space:]]*$'),
  ADD CONSTRAINT actividades_google_place_id_check
    CHECK (google_place_id IS NULL OR google_place_id !~ '^[[:space:]]*$');

COMMENT ON COLUMN public.actividades.direccion IS
  'Dirección editorial propia del evento; no una copia automática de Places.';
COMMENT ON COLUMN public.actividades.google_place_id IS
  'Legacy opcional; HU-23 no depende de Google. Se conserva para compatibilidad.';
COMMENT ON COLUMN public.actividades.latitud IS 'Latitud WGS84 seleccionada por el administrador; independiente del proveedor.';
COMMENT ON COLUMN public.actividades.longitud IS 'Longitud WGS84 seleccionada por el administrador; forma pareja nullable con latitud.';
NOTIFY pgrst, 'reload schema';
COMMIT;

/* Reversión conceptual, después de respaldar/exportar los nuevos campos:
   ALTER TABLE public.actividades
     DROP CONSTRAINT IF EXISTS actividades_direccion_check,
     DROP CONSTRAINT IF EXISTS actividades_google_place_id_check,
     DROP COLUMN IF EXISTS direccion,
     DROP COLUMN IF EXISTS google_place_id;
   No ejecutar la reversión automáticamente: elimina esos datos adicionales.
*/
