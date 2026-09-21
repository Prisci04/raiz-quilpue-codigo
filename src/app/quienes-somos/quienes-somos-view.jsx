"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function obtenerIniciales(nombre) {
  if (!nombre || nombre === "Nombre por confirmar") {
    return "RQ";
  }

  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export default function QuienesSomosView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function cargarInformacion() {
      try {
        const response = await fetch("/api/institucional", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            "No fue posible cargar la información institucional"
          );
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            "No fue posible cargar la información institucional en este momento."
          );
        }
      }
    }

    cargarInformacion();

    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f0e7] px-6 py-24 text-center">
        <h1 className="font-serif text-4xl text-[#6a422b]">
          Quiénes somos
        </h1>

        <p className="mt-5 text-[#755744]">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f5f0e7]">
        <div className="mx-auto max-w-6xl animate-pulse px-6 py-24">
          <div className="h-3 w-28 bg-[#d8cab6]" />
          <div className="mt-6 h-16 max-w-md bg-[#e2d7c6]" />
          <div className="mt-8 h-5 max-w-2xl bg-[#e2d7c6]" />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#f5f0e7] text-[#4b3325]">
      <section className="relative overflow-hidden bg-[#e8ddcc]">
        <div className="absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full border border-[#d5c5ae]" />
        <div className="absolute right-[100px] top-[-40px] h-[240px] w-[240px] rounded-full border border-[#d5c5ae]" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 lg:py-32">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
            {data.hero.eyebrow}
          </p>

          <h1 className="mt-5 font-serif text-6xl font-normal leading-[0.9] text-[#69432f] sm:text-7xl lg:text-8xl">
            Quiénes
            <br />
            <span className="italic">somos</span>
          </h1>

          <div className="mt-8 h-px w-64 bg-[#c99a28]" />

          <p className="mt-8 max-w-2xl text-base leading-8 text-[#735844] sm:text-lg">
            {data.hero.descripcion}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-24">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
            {data.mision.eyebrow}
          </p>

          <h2 className="mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight text-[#69432f] sm:text-4xl">
            {data.mision.titulo}
          </h2>

          <p className="mt-7 leading-8 text-[#755744]">
            {data.mision.descripcion}
          </p>

          <p className="mt-5 leading-8 text-[#755744]">
            {data.mision.descripcionSecundaria}
          </p>
        </div>

        <div className="relative min-h-[390px] overflow-hidden border border-[#d6c7b4] bg-[#e5daca]">
          <Image
            src={data.mision.imagen}
            alt="Archivo y memoria cultural"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#3b2619]/60 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e5b843]">
              Archivo vivo
            </p>

            <p className="mt-2 max-w-xs font-serif text-2xl text-white">
              Historias que conectan generaciones.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#6a422b]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7a42c]">
              {data.vision.eyebrow}
            </p>

            <h2 className="mt-4 font-serif text-3xl leading-tight text-[#f4eee5] sm:text-4xl">
              {data.vision.titulo}
            </h2>
          </div>

          <p className="border-l border-[#a77c60] pl-8 leading-8 text-[#e4d7ca]">
            {data.vision.descripcion}
          </p>
        </div>
      </section>

      <section className="bg-[#ebe3d6]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
            Nuestros valores
          </p>

          <h2 className="mt-3 font-serif text-3xl font-semibold text-[#69432f]">
            Lo que nos guía
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.valores.map((valor) => (
              <article
                key={valor.numero}
                className="group border border-[#d1c1ae] bg-[#f1eadf] p-6 transition duration-200 hover:-translate-y-1 hover:bg-[#f7f2e9] hover:shadow-sm"
              >
                <span className="font-mono text-[10px] tracking-[0.18em] text-[#c28f1d]">
                  {valor.numero}
                </span>

                <h3 className="mt-8 font-serif text-xl font-semibold text-[#69432f]">
                  {valor.titulo}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#755744]">
                  {valor.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.45fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
              Nuestro trabajo
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#69432f]">
              Qué hacemos
            </h2>

            <p className="mt-5 leading-7 text-[#755744]">
              Nuestro trabajo combina memoria, patrimonio, participación y
              tecnología para generar nuevas formas de relacionarnos con la
              historia local.
            </p>
          </div>

          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {data.lineasTrabajo.map((linea, index) => (
              <article
                key={linea.titulo}
                className="border-t border-[#cfc0ad] pt-5"
              >
                <span className="text-[10px] font-semibold tracking-[0.18em] text-[#c28f1d]">
                  0{index + 1}
                </span>

                <h3 className="mt-3 font-serif text-2xl font-semibold text-[#69432f]">
                  {linea.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#755744]">
                  {linea.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#282117]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d6a42e]">
              Nuestra plataforma digital
            </p>

            <h2 className="mt-4 font-serif text-3xl text-[#f4eee5] sm:text-4xl">
              Tecnología al servicio de la memoria
            </h2>

            <p className="mt-5 leading-7 text-[#bcae9e]">
              La plataforma digital permite organizar, conectar y presentar la
              información cultural desde una estructura preparada para crecer
              junto con las necesidades de Raíz Quilpué.
            </p>
          </div>

          <div className="mt-10 grid gap-px bg-[#594737] md:grid-cols-3">
            {data.plataforma.map((item) => (
              <article key={item.titulo} className="bg-[#282117] p-7">
                <div className="h-px w-8 bg-[#d6a42e]" />

                <h3 className="mt-6 font-serif text-xl text-[#f4eee5]">
                  {item.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#bcae9e]">
                  {item.descripcion}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:py-24">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
          Nuestro equipo
        </p>

        <h2 className="mt-3 font-serif text-3xl font-semibold text-[#69432f]">
          Personas que hacen posible Raíz
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {data.equipo.map((persona, index) => (
            <article
              key={`${persona.nombre}-${persona.cargo}`}
              className={`border border-[#d3c4b2] bg-[#eee6da] p-6 ${
                index === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div
                className={`flex ${
                  index === 0
                    ? "flex-col gap-6 sm:flex-row sm:items-center"
                    : "items-center gap-5"
                }`}
              >
                {persona.imagen ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[#c99a28]">
                    <Image
                      src={persona.imagen}
                      alt={persona.nombre}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-[#c99a28] bg-[#e1d4c2] font-serif text-2xl font-semibold text-[#69432f]">
                    {obtenerIniciales(persona.nombre)}
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#c28f1d]">
                    {persona.cargo}
                  </p>

                  <h3 className="mt-2 font-serif text-2xl font-semibold text-[#69432f]">
                    {persona.nombre}
                  </h3>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#755744]">
                    {persona.descripcion}
                  </p>

                  {!persona.confirmado ? (
                    <span className="mt-4 inline-block border border-[#d0c0ad] px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-[#8a715e]">
                      Información por confirmar
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#e4d8c7]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c28f1d]">
            Raíz Quilpué
          </p>

          <blockquote className="mt-6 font-serif text-3xl leading-tight text-[#69432f] sm:text-4xl">
            “Preservar la memoria es mantener vivo el vínculo entre quienes
            fuimos, quienes somos y quienes vendrán.”
          </blockquote>
        </div>
      </section>
    </main>
  );
}