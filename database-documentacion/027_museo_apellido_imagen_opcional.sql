/* Migración alineada a Supabase: apellido_aportante (nullable en filas
   antiguas) + imagen_url opcional.
   Aplicar después de 018_museo_aportes.sql.
   Los aportes NUEVOS exigen apellido en la app; los antiguos pueden
   quedar con apellido_aportante = NULL.
*/

ALTER TABLE public.museo_aportes
  ADD COLUMN IF NOT EXISTS apellido_aportante VARCHAR(160);

ALTER TABLE public.museo_aportes
  DROP CONSTRAINT IF EXISTS museo_aportes_apellido_check;

ALTER TABLE public.museo_aportes
  ADD CONSTRAINT museo_aportes_apellido_check
  CHECK (
    apellido_aportante IS NULL
    OR BTRIM(apellido_aportante) <> ''
  );

ALTER TABLE public.museo_aportes
  ALTER COLUMN imagen_url DROP NOT NULL;

ALTER TABLE public.museo_aportes
  DROP CONSTRAINT IF EXISTS museo_aportes_imagen_check;

ALTER TABLE public.museo_aportes
  ADD CONSTRAINT museo_aportes_imagen_check
  CHECK (
    imagen_url IS NULL
    OR BTRIM(imagen_url) <> ''
  );
