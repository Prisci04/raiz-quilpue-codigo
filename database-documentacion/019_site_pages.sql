ALTER TABLE public.museo_aportes
ADD COLUMN IF NOT EXISTS apellido_aportante VARCHAR(160);

CREATE TABLE IF NOT EXISTS public.site_page_content (
  page_key TEXT PRIMARY KEY
    CHECK (page_key IN ('inicio', 'quienes-somos')),
  content JSONB NOT NULL
    CHECK (jsonb_typeof(content) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INTEGER
    REFERENCES public.usuarios(id_user)
    ON DELETE SET NULL
);

ALTER TABLE public.site_page_content ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_page_content FROM anon;
REVOKE ALL ON public.site_page_content FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.site_page_content
TO service_role;
