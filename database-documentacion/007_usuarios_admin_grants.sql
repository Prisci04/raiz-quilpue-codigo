/* ============================================================
   PERMISOS PARA EL CRUD DE USUARIOS INTERNOS
   ============================================================ */

/*
  Ejecutar en el editor SQL de Supabase si el portal
  responde con error al crear, cambiar el rol o eliminar
  un usuario interno.

  No cambia columnas ni policies.
  service_role sigue sin policies públicas: el acceso
  entra solo desde la API de Next.js.
*/

GRANT INSERT, DELETE
ON public.usuarios
TO service_role;

GRANT USAGE, SELECT
ON SEQUENCE public.usuarios_id_seq
TO service_role;

GRANT INSERT, DELETE
ON public.usuario_roles
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.sesiones
TO service_role;
