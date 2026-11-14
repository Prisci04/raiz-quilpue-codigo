import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PAGINAS, getPagina, getSecciones } from "@/lib/paginas/estructura.mjs";

import CamposSeccionForm from "./CamposSeccionForm";
import DirectorioEditor from "./DirectorioEditor";
import ImagenesSeccionEditor from "./ImagenesSeccionEditor";
import { SeccionCard, Subtitulo } from "./ui";
import ValoresEditor from "./ValoresEditor";

/**
 * Editor de contenido de las páginas públicas. La estructura (qué secciones, campos,
 * listas e imágenes existen) es fija y viene de estructura.mjs: aquí solo se edita
 * el contenido.
 */
export default function PaginasPanel({ idPagina, data, error }) {
  const pagina = getPagina(idPagina);
  const secciones = getSecciones(idPagina);

  return (
    <section className="admin-page">
      <div>
        <p className="text-[13px] text-[#8d7b6d]">
          <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
          <span className="px-1.5" aria-hidden="true">›</span>
          Páginas del sitio
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
              Páginas del sitio
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#7c6a5c]">
              Edita los textos, valores, directorio e imágenes de las páginas públicas. La estructura de cada
              página es fija: aquí solo se modifica su contenido.
            </p>
          </div>
          <a
            href={pagina.ruta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810]"
          >
            Ver página pública
            <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        </div>
      </div>

      <nav aria-label="Página a editar" className="mt-5 flex flex-wrap gap-2 border-b border-[#e6ddd4]">
        {PAGINAS.map((item) => (
          <Link
            key={item.id}
            href={`/admin/paginas?pagina=${item.id}`}
            aria-current={item.id === idPagina ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold ${
              item.id === idPagina
                ? "border-[#db700f] text-[#2c1810]"
                : "border-transparent text-[#7c5c47] hover:text-[#2c1810]"
            }`}
          >
            {item.nombre}
          </Link>
        ))}
      </nav>

      {error || !data ? (
        <p role="alert" className="mt-6 rounded-sm border border-[#e7b2a6] bg-[#fde8e2] px-4 py-3 text-sm text-[#8d3b28]">
          {error || "No se pudo cargar el contenido de la página."}{" "}
          <Link href={`/admin/paginas?pagina=${idPagina}`} className="font-semibold underline">
            Reintentar
          </Link>
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {secciones.map((def) => {
            const contenido = data.secciones[def.codigo];
            const id = `pagina-${idPagina}-${def.codigo}`;

            return (
              <SeccionCard key={id} id={id} titulo={def.titulo} descripcion={def.descripcion}>
                <CamposSeccionForm
                  idPagina={idPagina}
                  seccion={def}
                  valoresIniciales={contenido.campos}
                />

                {def.lista === "valores" ? (
                  <>
                    <Subtitulo>Valores de la organización</Subtitulo>
                    <ValoresEditor valores={contenido.valores} />
                  </>
                ) : null}

                {def.lista === "integrantes" ? (
                  <>
                    <Subtitulo>Personas del directorio</Subtitulo>
                    <DirectorioEditor integrantes={contenido.integrantes} cargos={data.cargos} />
                  </>
                ) : null}

                {def.imagenes ? (
                  <>
                    <Subtitulo>Fotografías</Subtitulo>
                    <ImagenesSeccionEditor
                      idPagina={idPagina}
                      codigo={def.codigo}
                      imagenesIniciales={contenido.imagenes}
                      max={def.imagenes.max}
                      ayuda={def.imagenes.ayuda}
                    />
                  </>
                ) : null}
              </SeccionCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
