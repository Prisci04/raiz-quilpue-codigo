
/* CREATE TABLE */
CREATE TABLE public.paginas (
    id_pagina INTEGER PRIMARY KEY,
    nombre_pagina VARCHAR(100) NOT NULL
);

/* CONSTRAINTS */
ALTER TABLE public.paginas
ADD CONSTRAINT paginas_nombre_check
CHECK (BTRIM(nombre_pagina) <> '');

ALTER TABLE public.paginas
ADD CONSTRAINT paginas_id_fijo_check
CHECK (id_pagina IN (1, 2));



/* SEGURIDAD Y PERMISOS */
ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.paginas FROM anon, authenticated;
GRANT SELECT ON public.paginas TO anon, authenticated;
GRANT SELECT ON public.paginas TO service_role;


/* POLÍTICA PÚBLICA */
CREATE POLICY "Lectura pública páginas"
ON public.paginas
FOR SELECT
TO anon, authenticated
USING (TRUE);


/* INSERT INICIAL */
INSERT INTO public.paginas (id_pagina, nombre_pagina)
VALUES
    (1, 'Inicio'),
    (2, 'Quiénes somos');

/* SELECT DE COMPROBACIÓN */
SELECT * FROM public.paginas ORDER BY id_pagina;
