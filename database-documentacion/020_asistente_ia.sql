/* HU-22. Migración LOCAL para revisión y aplicación manual autorizada.
   No ejecutar desde la aplicación. No crea conversaciones ni almacena claves.
   Las sesiones y los roles del proyecto se verifican en las APIs Next.js.
   service_role solo se utiliza en servidor; authenticated no equivale al Admin.
*/
BEGIN;
CREATE TABLE IF NOT EXISTS public.ia_configuracion (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  nombre VARCHAR(80) NOT NULL CHECK (BTRIM(nombre) <> ''),
  mensaje_inicial VARCHAR(600) NOT NULL CHECK (BTRIM(mensaje_inicial) <> ''),
  mensaje_desconocido VARCHAR(600) NOT NULL CHECK (BTRIM(mensaje_desconocido) <> ''),
  instrucciones VARCHAR(2000) NOT NULL CHECK (BTRIM(instrucciones) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ia_conocimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(160) NOT NULL CHECK (BTRIM(titulo) <> ''),
  categoria VARCHAR(80) NOT NULL CHECK (BTRIM(categoria) <> ''),
  contenido VARCHAR(8000) NOT NULL CHECK (BTRIM(contenido) <> ''),
  orden INTEGER NOT NULL DEFAULT 0 CHECK (orden BETWEEN 0 AND 9999),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ia_conocimiento_activo_orden_idx ON public.ia_conocimiento (activo, orden);

CREATE OR REPLACE FUNCTION public.ia_actualizar_fecha()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ia_actualizar_fecha() FROM PUBLIC;
DROP TRIGGER IF EXISTS ia_configuracion_fecha ON public.ia_configuracion;
CREATE TRIGGER ia_configuracion_fecha BEFORE UPDATE ON public.ia_configuracion
  FOR EACH ROW EXECUTE FUNCTION public.ia_actualizar_fecha();
DROP TRIGGER IF EXISTS ia_conocimiento_fecha ON public.ia_conocimiento;
CREATE TRIGGER ia_conocimiento_fecha BEFORE UPDATE ON public.ia_conocimiento
  FOR EACH ROW EXECUTE FUNCTION public.ia_actualizar_fecha();

ALTER TABLE public.ia_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_conocimiento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ia_configuracion, public.ia_conocimiento FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.ia_configuracion TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_conocimiento TO service_role;
GRANT SELECT ON public.ia_conocimiento TO anon;
DROP POLICY IF EXISTS ia_conocimiento_lectura_activa ON public.ia_conocimiento;
CREATE POLICY ia_conocimiento_lectura_activa ON public.ia_conocimiento FOR SELECT TO anon USING (activo = TRUE);

INSERT INTO public.ia_configuracion (id, nombre, mensaje_inicial, mensaje_desconocido, instrucciones)
VALUES (1, 'Asistente Raíz',
  'Hola, soy el asistente de Raíz Quilpué. ¿Qué te gustaría conocer sobre nuestro patrimonio y actividades?',
  'Todavía no tengo información suficiente para responder. Puedes explorar los contenidos y actividades de Raíz Quilpué.',
  'Responde brevemente en español. Usa solo la información disponible de Raíz Quilpué. No inventes datos; admite cuando no conoces una respuesta.')
ON CONFLICT (id) DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;

/* Reversión manual, solo tras respaldar la información editorial:
   DROP TABLE public.ia_conocimiento;
   DROP TABLE public.ia_configuracion;
   DROP FUNCTION public.ia_actualizar_fecha();
*/
