"use client";

import { LIMITES } from "@/lib/paginas/estructura.mjs";
import { valoresApi } from "@/lib/api/paginas";

import ListaEditable from "./ListaEditable";

const CAMPOS = [
  { name: "texto_superior", label: "Texto superior", maxLength: LIMITES.valores.texto_superior },
  { name: "titulo", label: "Título", required: true, maxLength: LIMITES.valores.titulo },
  {
    name: "descripcion",
    label: "Descripción",
    tipo: "textarea",
    maxLength: LIMITES.valores.descripcion,
  },
];

const TEXTOS = {
  agregar: "Agregar valor",
  nuevoTitulo: "Nuevo valor",
  editarTitulo: "Editar valor",
  eliminarTitulo: "¿Eliminar valor?",
  vacio: "Aún no hay valores. Agrega el primero para que aparezca en el sitio.",
  creado: "Valor agregado.",
  actualizado: "Valor actualizado.",
  eliminado: "Valor eliminado.",
  reordenado: "Orden actualizado.",
};

export default function ValoresEditor({ valores }) {
  return (
    <ListaEditable
      titulo="Valores"
      itemsIniciales={valores}
      api={valoresApi}
      campos={CAMPOS}
      formularioVacio={{ texto_superior: "", titulo: "", descripcion: "" }}
      aFormulario={(valor) => ({
        texto_superior: valor.texto_superior ?? "",
        titulo: valor.titulo,
        descripcion: valor.descripcion ?? "",
      })}
      nombreItem={(valor) => valor.titulo}
      max={LIMITES.valores.max_items}
      textos={TEXTOS}
      resumen={(valor) => (
        <>
          {valor.texto_superior ? (
            <p className="text-[11px] tracking-wide text-[#db700f] uppercase">{valor.texto_superior}</p>
          ) : null}
          <p className="font-medium">{valor.titulo}</p>
          {valor.descripcion ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#7c6a5c]">{valor.descripcion}</p>
          ) : null}
        </>
      )}
    />
  );
}
