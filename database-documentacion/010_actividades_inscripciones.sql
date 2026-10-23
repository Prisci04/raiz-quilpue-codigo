/* Parche sobre 009: unicidad por correo, teléfono y email válidos
   e inscripción atómica con cupos.
   Se puede volver a ejecutar: índice IF NOT EXISTS, CHECK se recrean. */

CREATE UNIQUE INDEX IF NOT EXISTS actividad_inscripciones_email_unique
ON public.actividad_inscripciones (actividad_id, LOWER(email));

ALTER TABLE public.actividad_inscripciones
    DROP CONSTRAINT IF EXISTS actividad_inscripciones_telefono_check;

ALTER TABLE public.actividad_inscripciones
    ADD CONSTRAINT actividad_inscripciones_telefono_check
    CHECK (
        BTRIM(telefono) <> ''
        AND length(regexp_replace(telefono, '\D', '', 'g')) BETWEEN 8 AND 15
    );

ALTER TABLE public.actividad_inscripciones
    DROP CONSTRAINT IF EXISTS actividad_inscripciones_email_check;

ALTER TABLE public.actividad_inscripciones
    ADD CONSTRAINT actividad_inscripciones_email_check
    CHECK (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$');

CREATE OR REPLACE FUNCTION public.inscribir_actividad(
    p_actividad_id BIGINT,
    p_nombre VARCHAR,
    p_apellido VARCHAR,
    p_email VARCHAR,
    p_telefono VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_actividad public.actividades%ROWTYPE;
    v_count INTEGER;
    v_id BIGINT;
    v_hoy DATE := (TIMEZONE('America/Santiago', NOW()))::DATE;
BEGIN
    SELECT *
    INTO v_actividad
    FROM public.actividades
    WHERE id = p_actividad_id
    FOR UPDATE;

    IF NOT FOUND
        OR v_actividad.estado <> 'publicada'
        OR v_actividad.tipo_participacion <> 'inscripcion'
    THEN
        RETURN jsonb_build_object('error', 'ACTIVITY_UNAVAILABLE');
    END IF;

    IF v_actividad.fecha IS NOT NULL AND v_actividad.fecha < v_hoy THEN
        RETURN jsonb_build_object('error', 'ACTIVITY_ENDED');
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM public.actividad_inscripciones
    WHERE actividad_id = p_actividad_id;

    IF v_actividad.cupos IS NOT NULL AND v_count >= v_actividad.cupos THEN
        RETURN jsonb_build_object('error', 'NO_PLACES');
    END IF;

    INSERT INTO public.actividad_inscripciones (
        actividad_id,
        nombre,
        apellido,
        email,
        telefono
    )
    VALUES (
        p_actividad_id,
        p_nombre,
        p_apellido,
        p_email,
        p_telefono
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('error', 'ALREADY_REGISTERED');
    WHEN check_violation THEN
        RETURN jsonb_build_object('error', 'INVALID_CONTACT');
END;
$$;

REVOKE ALL ON FUNCTION public.inscribir_actividad(BIGINT, VARCHAR, VARCHAR, VARCHAR, VARCHAR)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.inscribir_actividad(BIGINT, VARCHAR, VARCHAR, VARCHAR, VARCHAR)
TO service_role;

NOTIFY pgrst, 'reload schema';
