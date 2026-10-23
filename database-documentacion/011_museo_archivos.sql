/* Parche sobre 009: archivo del aporte, estado de revisión y vínculo
   con la pieza. También deja el archivo original en museo_piezas.
   Se puede volver a ejecutar: columnas IF NOT EXISTS y GRANT. */

ALTER TABLE public.museo_piezas
    ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(255);

ALTER TABLE public.museo_piezas
    ADD COLUMN IF NOT EXISTS archivo_url TEXT;

ALTER TABLE public.museo_aportes
    ADD COLUMN IF NOT EXISTS archivo_url TEXT;

ALTER TABLE public.museo_aportes
    ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(20) NOT NULL DEFAULT 'pendiente';

ALTER TABLE public.museo_aportes
    ADD COLUMN IF NOT EXISTS pieza_id BIGINT REFERENCES public.museo_piezas(id) ON DELETE SET NULL;

ALTER TABLE public.museo_aportes
    DROP CONSTRAINT IF EXISTS museo_aportes_estado_revision_check;

ALTER TABLE public.museo_aportes
    ADD CONSTRAINT museo_aportes_estado_revision_check
    CHECK (estado_revision IN ('pendiente', 'convertido', 'rechazado'));

CREATE INDEX IF NOT EXISTS idx_museo_aportes_estado_revision
    ON public.museo_aportes (estado_revision, fecha_creacion DESC);

GRANT INSERT, SELECT, UPDATE, DELETE ON public.museo_aportes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.museo_piezas TO service_role;
