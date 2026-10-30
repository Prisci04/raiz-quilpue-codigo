/* HU-23 — REQUIERE APLICACIÓN REMOTA por un responsable autorizado.
   Preparado para revisión; no ejecutar automáticamente desde la aplicación.
   Aditivo: conserva lugar, filas históricas, RLS y permisos actuales.
*/
BEGIN;
ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(500),
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

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
  'Referencia Google opcional. Sin unicidad, coordenadas ni respuesta Places.';
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
