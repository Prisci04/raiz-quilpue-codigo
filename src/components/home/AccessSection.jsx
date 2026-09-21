import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Landmark, Library, Newspaper } from "lucide-react";

const accessItems = [
  {
    title: "Patrimonio",
    description: "Fotografías, documentos y objetos históricos de Quilpué.",
    href: "/contenido?tipo=patrimonio",
    cta: "Ver patrimonio",
    image: "/images/contenido/iglesia desde plaza.jpg",
    imageAlt: "Torre de la iglesia de Quilpué",
    countKey: "patrimonio",
    countSingular: "pieza",
    countPlural: "piezas",
    icon: Landmark,
  },
  {
    title: "Noticias",
    description: "Publicaciones, artículos e historias de la comunidad.",
    href: "/contenido?tipo=noticia",
    cta: "Leer noticias",
    image: "/images/inicio/imgini7.jpg",
    imageAlt: "Archivo de recomendaciones de Raíz Quilpué",
    countKey: "noticia",
    countSingular: "publicación",
    countPlural: "publicaciones",
    icon: Newspaper,
  },
  {
    title: "Actividades",
    description: "Talleres, visitas guiadas y eventos culturales.",
    href: "/actividades",
    cta: "Ver actividades",
    image: "/images/inicio/imgini4.JPG",
    imageAlt: "Presentación musical de la comunidad",
    countKey: "actividades",
    countSingular: "evento",
    countPlural: "eventos",
    icon: CalendarDays,
  },
  {
    title: "Museo Digital",
    description: "Colección permanente de piezas del patrimonio local.",
    href: "/contenido",
    cta: "Entrar al museo",
    image: "/images/contenido/reloj y vaca Quilpué -01.jpeg",
    imageAlt: "Fotografía patrimonial del reloj de Quilpué",
    countKey: "museo",
    countSingular: "registro",
    countPlural: "registros",
    icon: Library,
  },
];

function formatCount(count, singular, plural) {
  if (!count) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function AccessSection({ contents = [], activities = [] }) {
  const counts = {
    patrimonio: contents.filter((item) => item.tipo === "patrimonio").length,
    noticia: contents.filter((item) => item.tipo === "noticia").length,
    actividades: activities.length,
    museo: contents.length,
  };

  return (
    <section aria-labelledby="accesos-heading" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16">
      <div className="mb-10 max-w-2xl">
        <div className="section-label mb-2">Accesos principales</div>
        <h2 id="accesos-heading" className="font-serif text-3xl font-semibold text-[#704a31] md:text-4xl">
          Explora las colecciones
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#946541] md:text-base">
          Cuatro entradas para recorrer el patrimonio, las noticias, las actividades y el museo digital de Quilpué.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {accessItems.map((item) => {
          const countLabel = formatCount(counts[item.countKey], item.countSingular, item.countPlural);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col overflow-hidden border border-[#bb9c82] bg-[#e7dcd2] text-[#946541] shadow-[0_10px_24px_rgba(112,74,49,0.08)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#946541] hover:shadow-[0_18px_36px_rgba(112,74,49,0.16)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#704a31]"
              >
                <div className="relative h-44 overflow-hidden bg-[#bb9c82]/30">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(112,74,49,0.55) 0%, rgba(112,74,49,0.08) 55%, transparent 100%)",
                    }}
                  />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center bg-[#e7dcd2] text-[#704a31] shadow-[0_4px_12px_rgba(112,74,49,0.18)]">
                    <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
                  {countLabel ? (
                    <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-[#db700f] uppercase">
                      {countLabel}
                    </p>
                  ) : null}
                  <h3 className="font-serif text-xl font-semibold text-[#704a31]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#946541]">{item.description}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#db700f] uppercase transition-colors group-hover:text-[#704a31]">
                    {item.cta}
                    <ArrowRight
                      size={14}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
