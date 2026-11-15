
/* CREATE TABLE */

CREATE TABLE public.imagenes_seccion (
    id_seccion INTEGER NOT NULL,
    id_imagen INTEGER NOT NULL,
    orden INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (id_seccion, id_imagen)
);


/* CONSTRAINTS */

ALTER TABLE public.imagenes_seccion
ADD CONSTRAINT imagenes_seccion_orden_check
CHECK (
    orden > 0
);


/* FOREIGN KEYS */

ALTER TABLE public.imagenes_seccion
ADD CONSTRAINT imagenes_seccion_seccion_fk
FOREIGN KEY (id_seccion)
REFERENCES public.secciones_pagina(id_seccion)
ON DELETE RESTRICT;

ALTER TABLE public.imagenes_seccion
ADD CONSTRAINT imagenes_seccion_imagen_fk
FOREIGN KEY (id_imagen)
REFERENCES public.imagenes(id_imagen)
ON DELETE RESTRICT;


/* SEGURIDAD Y PERMISOS */

ALTER TABLE public.imagenes_seccion
ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.imagenes_seccion
FROM anon, authenticated;

GRANT SELECT
ON public.imagenes_seccion
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.imagenes_seccion
TO service_role;


/* POLÍTICA PÚBLICA */

CREATE POLICY "Lectura publica imagenes seccion"
ON public.imagenes_seccion
FOR SELECT
TO anon, authenticated
USING (TRUE);


/* ÍNDICES */

-- La clave primaria compuesta ya crea un índice.

CREATE INDEX imagenes_seccion_imagen_idx
ON public.imagenes_seccion (id_imagen);


/* INSERT */


/* SELECT - COMPROBACIÓN */

SELECT
    p.nombre_pagina,
    s.codigo_seccion,
    i.id_imagen,
    i.bucket,
    i.ruta_imagen,
    i.descripcion_imagen,
    rel.orden AS orden_imagen
FROM public.secciones_pagina s

INNER JOIN public.paginas p
    ON p.id_pagina = s.id_pagina

LEFT JOIN public.imagenes_seccion rel
    ON rel.id_seccion = s.id_seccion

LEFT JOIN public.imagenes i
    ON i.id_imagen = rel.id_imagen

ORDER BY
    p.id_pagina,
    s.orden,
    rel.orden,
    i.id_imagen;
