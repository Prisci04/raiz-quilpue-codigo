import { supabase } from "@/lib/supabase";

export default async function ActividadesPage() {
  const { data: actividades, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("estado", "publicada")
    .order("fecha", { ascending: true });

  if (error) {
    console.error(error);

    return (
      <main>
        <h1>Error al cargar actividades</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Actividades</h1>

      {actividades?.map((actividad) => (
        <article key={actividad.id}>
          <h2>{actividad.titulo}</h2>

          <p>{actividad.descripcion}</p>

          <p>Fecha: {actividad.fecha}</p>

          <p>Hora: {actividad.hora_inicio}</p>

          <p>Ubicación: {actividad.ubicacion}</p>

          <p>Cupos: {actividad.cupos}</p>
        </article>
      ))}
    </main>
  );
}