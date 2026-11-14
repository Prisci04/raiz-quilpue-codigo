import Image from "next/image";
import { BookOpen, Handshake, MapPinned, Users } from "lucide-react";

import { PAGINA_QUIENES_SOMOS } from "@/lib/paginas/estructura.mjs";
import { initials, splitParagraphs, valorLayout } from "@/lib/paginas/text.mjs";
import { getPaginaPublica } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

/*
  Editable desde Gestión de Páginas: textos de cada sección, valores y directorio.
  Se mantienen en el código (no son editables): los títulos fijos de cada bloque,
  los íconos y colores de los valores, la sección Fundadores y el año de fundación.
*/
const content = {
  historyYears: "2026",
  foundersTitle: "Fundadores",
  foundersSubtitle: "Nuestros orígenes",
  foundersLead: "Cuatro personas dieron el primer paso para hacer crecer esta raíz.",
  founders: [
    { name: "Millaray Demanet", role: "Presidenta" },
    { name: "Angelo Villagrán", role: "Vicepresidente" },
    { name: "Melissa Pacheco", role: "Tesorera" },
    { name: "Javiera Chappa", role: "Secretaria" },
  ],
  foundationLabel: "Fundación Raíz Quilpué",
  foundationDate: "17 de junio de 2026",
  foundationText:
    "El 17 de junio de 2026 ocurrió un hito muy importante para nosotros: oficialmente se firmó para ser una corporación sin fines de lucro, desde la comunidad para la comunidad, con el fin de valorar, preservar y unir el patrimonio, cultura e historia de nuestro Quilpué.",
};

const images = {
  mission: "/images/quienes-somos/Foto Fundadores.png",
};

/* Íconos y colores de cada tarjeta de valor, según su posición en la lista. */
const VALUE_STYLES = [
  { icon: MapPinned, background: "#687a42", ink: "#e7dcd2", numberColor: "#feca2b" },
  { icon: BookOpen, background: "#ffdf90", ink: "#704a31", numberColor: "#db700f" },
  { icon: Users, background: "#8ebcc2", ink: "#704a31", numberColor: "#e7dcd2" },
  { icon: Handshake, background: "#db700f", ink: "#e7dcd2", numberColor: "#ffdf90" },
];

function Retrato({ nombre, foto, className, style, size }) {
  if (foto) {
    return (
      <Image
        src={foto.url}
        alt={nombre}
        width={size}
        height={size}
        className={className}
        unoptimized
        style={style}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={nombre}
      className={`${className} flex items-center justify-center bg-[#ffdf90] font-serif font-semibold text-[#704a31]`}
      style={style}
    >
      {initials(nombre)}
    </div>
  );
}

export default async function QuienesSomosPage() {
  let pagina = null;

  try {
    pagina = await getPaginaPublica(PAGINA_QUIENES_SOMOS);
  } catch {
    console.error("[QuienesSomosPage] No se pudo cargar el contenido de la página");
  }

  if (!pagina) {
    return (
      <main className="bg-[#e7dcd2] px-6 py-32 text-center text-[#946541]">
        <p role="alert">No fue posible cargar esta página. Inténtalo de nuevo más tarde.</p>
      </main>
    );
  }

  const { presentacion_mision: mision, valores, directorio, cierre } = pagina.secciones;
  const missionParagraphs = splitParagraphs(mision.campos.parrafos_mision);
  const [director, ...board] = directorio.integrantes;
  const quote = cierre.campos.contenido_cierre;

  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25 px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
        <div className="mx-auto max-w-7xl text-center">
          {mision.campos.texto_superior ? (
            <div className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              {mision.campos.texto_superior}
            </div>
          ) : null}
          <h1 className="font-serif text-[clamp(2.5rem,5vw,3.8rem)] leading-tight font-semibold text-[#704a31]">
            {mision.campos.titulo_pagina}
          </h1>
          <div className="mx-auto mt-6 h-px w-32 bg-[#704a31]" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              Nuestra misión
            </div>
            {mision.campos.titulo_mision ? (
              <h2 className="mb-6 font-serif text-3xl leading-tight font-semibold text-[#946541] sm:text-4xl">
                {mision.campos.titulo_mision}
              </h2>
            ) : null}
            {missionParagraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`} className="mb-4 text-base leading-relaxed whitespace-pre-line text-[#946541]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="relative lg:pl-4">
            <Image
              src={images.mission}
              alt="Calle comercial de Quilpué"
              width={1200}
              height={900}
              className="h-80 w-full object-cover sm:h-[28rem]"
              unoptimized
              style={{ filter: "sepia(15%)" }}
            />
            <div className="absolute -bottom-5 -left-2 flex h-32 w-32 items-center justify-center bg-[#ffdf90] sm:-left-5">
              <div className="text-center text-[#946541]">
                <div className="font-serif text-3xl font-bold">{content.historyYears}</div>
                <div className="font-mono text-[9px] tracking-wide uppercase">
                  Comienzos
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#bb9c82]/25 px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between md:mb-8">
            <div>
              <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
                Nuestros valores
              </div>
              <h2 className="font-serif text-3xl font-semibold text-[#704a31] sm:text-4xl">
                {valores.campos.titulo_seccion}
              </h2>
            </div>
            {valores.valores.length > 0 ? (
              <p className="hidden font-mono text-[10px] tracking-[0.28em] text-[#946541] uppercase md:block">
                01 — {String(valores.valores.length).padStart(2, "0")}
              </p>
            ) : null}
          </div>

          {valores.valores.length > 0 ? (
            <ol className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
              {valores.valores.map((value, index) => {
                const { preset, span } = valorLayout(index, valores.valores.length);
                const { icon: Icon, background, ink, numberColor } = VALUE_STYLES[preset];
                const number = String(index + 1).padStart(2, "0");

                return (
                  <li
                    key={value.id}
                    className={`relative overflow-hidden p-5 sm:p-6 ${span}`}
                    style={{ background, color: ink }}
                  >
                    <span
                      className="pointer-events-none absolute top-3 right-2 font-sans text-3xl leading-none font-light select-none sm:text-4xl"
                      style={{ color: numberColor, opacity: 0.38 }}
                      aria-hidden="true"
                    >
                      {number}
                    </span>

                    <article className="relative flex flex-col gap-3 pr-10 sm:pr-14">
                      <div className="flex items-center gap-2">
                        <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                        {value.texto_superior ? (
                          <span className="font-mono text-[9px] tracking-[0.2em] uppercase">
                            {value.texto_superior}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="font-serif text-lg leading-snug font-semibold italic sm:text-xl">
                          {value.titulo}
                        </h3>
                        {value.descripcion ? (
                          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line opacity-90">
                            {value.descripcion}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[#946541]">Pronto compartiremos los valores que nos guían.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
          Quienes hacen posible Raíz Quilpué
        </div>
        <h2 className="mb-10 font-serif text-3xl font-semibold text-[#946541]">
          {directorio.campos.titulo_seccion}
        </h2>

        {director ? (
          <article className="mb-8 flex flex-col gap-8 bg-[#bb9c82]/25 p-6 sm:p-8 md:flex-row">
            <div className="shrink-0">
              <Retrato
                nombre={director.nombre}
                foto={director.imagen}
                size={600}
                className="h-40 w-40 object-cover object-top"
                style={{ border: "3px solid #feca2b" }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
                {director.cargo}
              </div>
              <h3 className="mb-2 font-serif text-2xl font-semibold text-[#946541]">
                {director.nombre}
              </h3>
              {director.descripcion ? (
                <p className="max-w-xl text-sm leading-relaxed whitespace-pre-line text-[#946541]">
                  {director.descripcion}
                </p>
              ) : null}
            </div>
          </article>
        ) : (
          <p className="text-[#946541]">Pronto publicaremos a las personas que integran el directorio.</p>
        )}

        {board.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {board.map((person) => (
              <article
                key={person.id}
                className="bg-[#e7dcd2] p-6 text-center"
                style={{ border: "1px solid var(--border)" }}
              >
                <Retrato
                  nombre={person.nombre}
                  foto={person.imagen}
                  size={400}
                  className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
                  style={{ border: "2px solid #feca2b" }}
                />
                <h3 className="font-serif text-base font-semibold text-[#946541]">
                  {person.nombre}
                </h3>
                <p className="mt-1 font-mono text-[10px] tracking-wide text-[#946541]">
                  {person.cargo}
                </p>
                {person.descripcion ? (
                  <p className="mt-3 text-xs leading-relaxed whitespace-pre-line text-[#946541]">
                    {person.descripcion}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-[#687a42] px-6 py-12 text-[#e7dcd2] sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#feca2b] uppercase">
                {content.foundersSubtitle}
              </div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
                {content.foundersTitle}
              </h2>
              <p className="mt-4 font-serif text-xl leading-snug italic">
                {content.foundersLead}
              </p>
            </div>

            <div className="lg:col-span-8">
              <div className="mb-8 flex gap-5 sm:gap-6">
                <div className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center bg-[#ffdf90] text-[#687a42]">
                  <div className="text-center">
                    <div className="px-1 font-serif text-xs leading-tight font-bold">
                      {content.foundationDate}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#feca2b] uppercase">
                    {content.foundationLabel}
                  </p>
                  <p className="text-sm leading-relaxed text-[#e7dcd2]/90">
                    {content.foundationText}
                  </p>
                </div>
              </div>

              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {content.founders.map((person) => (
                  <li key={person.name}>
                    <p className="font-serif text-lg leading-snug italic">
                      {person.name}
                    </p>
                    <div className="mt-3 h-px w-12 bg-[#feca2b]" aria-hidden="true" />
                    <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase">
                      {person.role}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {quote ? (
        <section className="bg-[#e7dcd2] px-6 py-16 text-center sm:py-24">
          {cierre.campos.titulo_cierre ? (
            <p className="mb-5 text-[11px] font-semibold tracking-[0.28em] text-[#db700f] uppercase">
              {cierre.campos.titulo_cierre}
            </p>
          ) : null}
          <blockquote className="mx-auto max-w-3xl font-serif text-2xl leading-snug font-medium text-[#704a31] sm:text-4xl sm:leading-tight">
            “{quote}”
          </blockquote>
        </section>
      ) : null}
    </main>
  );
}
