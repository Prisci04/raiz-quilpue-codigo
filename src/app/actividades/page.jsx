import { fetchActividadesPublicas } from "@/lib/api/actividades";

const MENSAJES = {
  vacio: "No hay actividades publicadas.",
  error: "Error al obtener las actividades.",
};

export default async function ActividadesPage() {
  let actividades = [];
  let estado = "ok";

  try {
    actividades = await fetchActividadesPublicas({ page: 1, limit: 10 });
    estado = actividades.length === 0 ? "vacio" : "ok";
  } catch {
    estado = "error";
  }

  return (
    <main>
      <h1>Actividades</h1>
      {estado !== "ok" ? <p>{MENSAJES[estado]}</p> : null}

      {estado === "ok"
        ? actividades.map((actividad) => (
            <article key={actividad.id}>
              <h2>{actividad.titulo}</h2>
              <p>{actividad.descripcion}</p>
              <p>Fecha: {actividad.fecha}</p>
              <p>Hora: {actividad.hora_inicio}</p>
              <p>Ubicación: {actividad.ubicacion}</p>
              <p>Cupos: {actividad.cupos}</p>
            </article>
          ))
        : null}
    </main>
  );
}
