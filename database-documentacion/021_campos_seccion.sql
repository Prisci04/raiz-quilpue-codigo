
/* CREATE TABLE */

CREATE TABLE public.campos_seccion (
    id_seccion INTEGER NOT NULL,
    codigo_campo VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL DEFAULT '',

    PRIMARY KEY (id_seccion, codigo_campo)
);


/* CONSTRAINTS */

ALTER TABLE public.campos_seccion
ADD CONSTRAINT campos_seccion_codigo_check
CHECK (
    BTRIM(codigo_campo) <> ''
);


/* FOREIGN KEYS */

ALTER TABLE public.campos_seccion
ADD CONSTRAINT campos_seccion_seccion_fk
FOREIGN KEY (id_seccion)
REFERENCES public.secciones_pagina(id_seccion)
ON DELETE RESTRICT;


/* SEGURIDAD Y PERMISOS */

ALTER TABLE public.campos_seccion
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campos_seccion
FROM anon, authenticated;

GRANT SELECT
ON public.campos_seccion
TO anon, authenticated;

GRANT SELECT, UPDATE
ON public.campos_seccion
TO service_role;


/* POLÍTICA PÚBLICA */

CREATE POLICY "Lectura pública campos de sección"
ON public.campos_seccion
FOR SELECT
TO anon, authenticated
USING (TRUE);


/* ÍNDICES */

-- La clave primaria compuesta
-- (id_seccion, codigo_campo)
-- crea automáticamente un índice.


/* INSERT */

INSERT INTO public.campos_seccion
(id_seccion, codigo_campo, valor)
SELECT
    s.id_seccion,
    datos.codigo_campo,
    datos.valor
FROM (
    VALUES
        -- INICIO: PORTADA
        (1, 'portada', 'texto_superior', ''),
        (1, 'portada', 'titulo',
         'Historias que dan forma a Quilpué'),
        (1, 'portada', 'descripcion', ''),

        -- INICIO: PRESENTACIÓN
        (1, 'presentacion', 'texto_superior', ''),
        (1, 'presentacion', 'titulo',
         '¿Qué es Raíz Quilpué?'),
        (1, 'presentacion', 'contenido', ''),

        -- QUIÉNES SOMOS: PRESENTACIÓN Y MISIÓN
        (2, 'presentacion_mision',
         'texto_superior', 'Raíz Quilpué'),

        (2, 'presentacion_mision',
         'titulo_pagina', 'Quiénes somos'),

        (2, 'presentacion_mision',
         'titulo_mision', 'Nuestra misión'),

        (2, 'presentacion_mision',
         'parrafos_mision', ''),

        -- QUIÉNES SOMOS: VALORES
        (2, 'valores',
         'titulo_seccion', 'Nuestros valores'),

        -- QUIÉNES SOMOS: DIRECTORIO
        (2, 'directorio',
         'titulo_seccion', 'Directorio'),

        -- QUIÉNES SOMOS: CIERRE
        (2, 'cierre', 'titulo_cierre', ''),
        (2, 'cierre', 'contenido_cierre', '')

) AS datos(
    id_pagina,
    codigo_seccion,
    codigo_campo,
    valor
)
JOIN public.secciones_pagina s
    ON s.id_pagina = datos.id_pagina
    AND s.codigo_seccion = datos.codigo_seccion;


/* SELECT */

SELECT
    p.nombre_pagina,
    s.codigo_seccion,
    c.codigo_campo,
    c.valor
FROM public.campos_seccion c

INNER JOIN public.secciones_pagina s
    ON c.id_seccion = s.id_seccion

INNER JOIN public.paginas p
    ON s.id_pagina = p.id_pagina

ORDER BY
    p.id_pagina,
    s.orden,
    c.codigo_campo;
