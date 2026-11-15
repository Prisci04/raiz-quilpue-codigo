"use client";

import { LIMITES } from "@/lib/paginas/estructura.mjs";
import { integrantesApi } from "@/lib/api/paginas";

import FotoIntegrante from "./FotoIntegrante";
import ListaEditable from "./ListaEditable";

const TEXTOS = {
  agregar: "Agregar integrante",
  nuevoTitulo: "Nuevo integrante",
  editarTitulo: "Editar integrante",
  eliminarTitulo: "¿Eliminar integrante?",
  vacio: "Aún no hay integrantes. Agrega el primero para que aparezca en el directorio.",
  creado: "Integrante agregado.",
  actualizado: "Integrante actualizado.",
  eliminado: "Integrante eliminado.",
  reordenado: "Orden actualizado.",
};

export default function DirectorioEditor({ integrantes, cargos }) {
  const campos = [
    {
      name: "id_cargo",
      label: "Cargo",
      tipo: "select",
      required: true,
      opciones: cargos.map((cargo) => ({ value: String(cargo.id), label: cargo.nombre })),
    },
    {
      name: "nombre_integrante",
      label: "Nombre",
      required: true,
      maxLength: LIMITES.integrantes.nombre,
    },
    {
      name: "descripcion",
      label: "Descripción",
      tipo: "textarea",
      maxLength: LIMITES.integrantes.descripcion,
    },
  ];

  return (
    <ListaEditable
      titulo="Integrantes"
      itemsIniciales={integrantes}
      api={integrantesApi}
      campos={campos}
      formularioVacio={{ id_cargo: "", nombre_integrante: "", descripcion: "" }}
      aFormulario={(integrante) => ({
        id_cargo: String(integrante.id_cargo),
        nombre_integrante: integrante.nombre,
        descripcion: integrante.descripcion ?? "",
      })}
      nombreItem={(integrante) => integrante.nombre}
      max={LIMITES.integrantes.max_items}
      textos={TEXTOS}
      extra={(integrante, { busy, ejecutar }) => (
        <FotoIntegrante integrante={integrante} busy={busy} ejecutar={ejecutar} />
      )}
      resumen={(integrante) => (
        <>
          <p className="text-[11px] tracking-wide text-[#db700f] uppercase">{integrante.cargo}</p>
          <p className="font-medium">{integrante.nombre}</p>
          {integrante.descripcion ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#7c6a5c]">{integrante.descripcion}</p>
          ) : null}
        </>
      )}
    />
  );
}
