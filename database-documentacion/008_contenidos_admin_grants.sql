/* ============================================================
   PERMISOS PARA LISTAR CONTENIDOS EN EL PANEL
   ============================================================ */

/*
  Ejecutar en el editor SQL de Supabase si el panel
  debe ver también los borradores.

  Hoy el rol público solo puede leer contenidos publicados.
  Este permiso no cambia columnas ni policies.
*/

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.contenidos
TO service_role;

GRANT USAGE, SELECT
ON SEQUENCE public.contenidos_id_seq
TO service_role;
