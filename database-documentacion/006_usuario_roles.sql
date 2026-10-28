/* ============================================================
   USUARIO ↔ ROLES — RAÍZ QUILPUÉ
   ============================================================ */


/* ============================================================
   1. TABLA RELACIONAL
   ============================================================ */

CREATE TABLE public.usuario_roles (
    usuario_id BIGINT NOT NULL,

    rol_id BIGINT NOT NULL,

    fecha_asignacion TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    /*
      Un mismo rol no puede asignarse dos veces
      al mismo usuario.
    */
    CONSTRAINT usuario_roles_pk
        PRIMARY KEY (
            usuario_id,
            rol_id
        ),

    CONSTRAINT usuario_roles_usuario_fk
        FOREIGN KEY (
            usuario_id
        )
        REFERENCES public.usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT usuario_roles_rol_fk
        FOREIGN KEY (
            rol_id
        )
        REFERENCES public.roles(id)
        ON DELETE CASCADE
);


/* ============================================================
   2. ÍNDICES
   ============================================================ */

CREATE INDEX idx_usuario_roles_usuario
ON public.usuario_roles (
    usuario_id
);


CREATE INDEX idx_usuario_roles_rol
ON public.usuario_roles (
    rol_id
);


/* ============================================================
   3. RLS
   ============================================================ */

ALTER TABLE public.usuario_roles
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.usuario_roles
FROM anon;

REVOKE ALL
ON public.usuario_roles
FROM authenticated;

GRANT SELECT, INSERT, DELETE
ON public.usuario_roles
TO service_role;

/* ============================================================
   4. ASIGNAR ADMINISTRADOR AL USUARIO INICIAL
   ============================================================ */

-- Parametro de sesion suministrado fuera del repositorio; sin el, no asigna roles.
INSERT INTO public.usuario_roles (
    usuario_id,
    rol_id
)
SELECT
    u.id,
    r.id

FROM public.usuarios u

JOIN public.roles r
    ON r.codigo = 'administrador'

WHERE
    LOWER(u.email) =
    LOWER(current_setting('raiz.bootstrap_email', true));


/* ============================================================
   5. VERIFICAR USUARIO + ROLES
   ============================================================ */

SELECT
    u.id AS usuario_id,

    u.nombre,
    u.apellido,
    u.email,

    r.id AS rol_id,
    r.codigo AS rol_codigo,
    r.nombre AS rol_nombre

FROM public.usuarios u

JOIN public.usuario_roles ur
    ON ur.usuario_id = u.id

JOIN public.roles r
    ON r.id = ur.rol_id

ORDER BY
    u.id,
    r.id;