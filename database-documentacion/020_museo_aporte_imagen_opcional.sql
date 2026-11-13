ALTER TABLE public.museo_aportes
ALTER COLUMN imagen_url DROP NOT NULL;

ALTER TABLE public.museo_aportes
DROP CONSTRAINT IF EXISTS museo_aportes_imagen_check;

ALTER TABLE public.museo_aportes
ADD CONSTRAINT museo_aportes_imagen_check
CHECK (
  imagen_url IS NULL OR BTRIM(imagen_url) <> ''
);
