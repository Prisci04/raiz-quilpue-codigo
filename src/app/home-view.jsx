"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const fallbackImage = "/images/inicio/imageninicio.jpg";

const heroSlides = [
  {
    // CAMBIAR IMAGEN AQUÍ: agrega aquí la primera foto histórica del inicio.
    image: "/images/inicio/imgini3.jpg",
    caption: "Calle comercial de Quilpué",
  },
  {
    // CAMBIAR IMAGEN AQUÍ: agrega aquí la segunda foto histórica del inicio.
    image: "/images/contenido/iglesia desde plaza.jpg",
    caption: "Plaza e Iglesia de Quilpué",
  },
  {
    // CAMBIAR IMAGEN AQUÍ: agrega aquí la tercera foto histórica del inicio.
    image: "/images/contenido/carozzi.jpeg",
    caption: "Compañía Carozzi en Quilpué",
  },
];

const accessCards = [
  {
    icon: "🏛️",
    title: "Patrimonio",
    description: "Fotografías, documentos y objetos históricos de Quilpué",
    href: "/contenido?tipo=patrimonio",
    color: "var(--primary)",
  },
  {
    icon: "📰",
    title: "Noticias",
    description: "Publicaciones, artículos e historias de la comunidad",
    href: "/contenido?tipo=noticia",
    color: "var(--terracotta)",
  },
  {
    icon: "📅",
    title: "Actividades",
    description: "Talleres, visitas guiadas y eventos culturales",
    href: "/actividades",
    color: "var(--primary)",
  },
  {
    icon: "🏺",
    title: "Museo Digital",
    description: "Colección permanente de piezas del patrimonio local",
    href: "/contenido",
    color: "var(--terracotta)",
  },
];

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getImage(image) {
  return image || fallbackImage;
}

export default function HomeView({ contents = [], activities = [] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setSlide((current) => (current + 1) % heroSlides.length),
      5000,
    );
    return () => clearInterval(timer);
  }, []);

  const featuredPatrimonio = useMemo(
    () => contents.filter((item) => item.tipo === "patrimonio").slice(0, 2),
    [contents],
  );
  const featuredNoticias = useMemo(
    () => contents.filter((item) => item.tipo === "noticia").slice(0, 2),
    [contents],
  );
  const nextActivity = activities[0] ?? null;

  function handleSearch(event) {
    event.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;

    if (term.includes("actividad") || term.includes("taller") || term.includes("evento")) {
      router.push("/actividades");
      return;
    }
    if (term.includes("quienes") || term.includes("nosotros")) {
      router.push("/quienes-somos");
      return;
    }
    router.push(`/contenido?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div>
      <section className="relative flex h-screen min-h-[600px] items-end overflow-hidden pb-20">
        {heroSlides.map((item, index) => (
          <div
            key={item.caption}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: slide === index ? 1 : 0 }}
          >
            <Image
              src={item.image}
              alt={item.caption}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
              style={{ filter: "sepia(20%) contrast(1.05) brightness(0.85)" }}
              unoptimized={item.image.startsWith("/")}
            />
          </div>
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(148,101,65,0.35) 0%, rgba(148,101,65,0.25) 40%, rgba(112,74,49,0.78) 100%)",
          }}
        />
        <div className="absolute right-6 bottom-4 font-mono text-[9px] tracking-wide text-[#e7dcd2]/55">
          {heroSlides[slide].caption}
        </div>
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
          {heroSlides.map((item, index) => (
            <button
              key={item.caption}
              type="button"
              aria-label={`Ver imagen ${index + 1}`}
              onClick={() => setSlide(index)}
              className="h-px w-5 transition-all duration-300"
              style={{
                background: slide === index ? "var(--accent)" : "rgba(231,220,210,0.35)",
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-6">
          <div className="max-w-2xl">
            <div className="section-label mb-4">Museo Digital · Quilpué, Chile</div>
            <h1 className="mb-6 font-serif text-5xl leading-[1.07] font-light text-white md:text-7xl">
              Historias que
              <br />
              <em className="text-[#e48d40]">construyen</em>
              <br />
              nuestra memoria
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-[#e7dcd2]/85 md:text-lg">
              Un espacio para descubrir, preservar y compartir la historia, cultura y patrimonio de Quilpué.
            </p>
            <form onSubmit={handleSearch} className="flex max-w-lg">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en el patrimonio de Quilpué..."
                className="flex-1 px-4 py-3 text-sm outline-none"
                style={{ background: "rgba(231,220,210,0.94)", color: "var(--foreground)" }}
              />
              <button type="submit" className="btn-primary px-5" aria-label="Buscar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px md:grid-cols-4">
            {[{ label: "Comienzo", value: "2026" }, { label: "Años de historia", value: "1" }, { label: "Actividades 2026", value: String(activities.length) }, { label: "Contenidos publicados", value: String(contents.length) }].map((stat) => (
              <div key={stat.label} className="px-4 py-3" style={{ background: "rgba(148,101,65,0.65)", backdropFilter: "blur(4px)" }}>
                <div className="font-serif text-2xl font-bold text-white">{stat.value}</div>
                <div className="mt-0.5 font-mono text-[9px] tracking-wide text-[#e7dcd2]/55 uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#bb9c82]/25 px-6 py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="section-label mb-3">¿Qué es Raíz Quilpué?</div>
            <h2 className="mb-5 font-serif text-4xl leading-tight font-semibold text-[#946541]">Raíz Quilpué es una corporación cultural</h2>
            <p className="mb-4 text-base leading-relaxed text-[#946541]">Raíz Quilpué es una plataforma cultural que reúne el patrimonio histórico, las noticias y las actividades de la comunidad quilpueína en un solo espacio digital.</p>
            <p className="mb-6 text-base leading-relaxed text-[#946541]">El 17 de Junio de 2026  ocurrio un hito muy importante para nosotros oficialmente se firmo para ser una Corporación sin fines de lucro desde la comunidad para la comunidad, con el fin de valorar, preservar y unir el patrimonio, cultura e historia de nuestro Quilpué.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => router.push("/quienes-somos")} className="btn-primary px-4 py-3">Conocer más</button>
              <button type="button" onClick={() => router.push("/contenido")} className="btn-outline px-4 py-3">Explorar museo</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* CAMBIAR IMAGEN AQUÍ: reemplaza este placeholder por una foto histórica de inicio. */}
            <Image src={"/images/inicio/imgini5.jpg"} alt="Patrimonio de Quilpué" width={800} height={600} className="aspect-[4/3] w-full object-cover" unoptimized />
            {/* CAMBIAR IMAGEN AQUÍ: agrega aquí otra foto histórica. */}
            <Image src={"/images/inicio/imgini6.jpg"} alt="Historia de Quilpué" width={800} height={600} className="mt-6 aspect-[4/3] w-full object-cover" unoptimized />
            {/* CAMBIAR IMAGEN AQUÍ: agrega aquí una imagen panorámica de Quilpué. */}
            <Image src={"/images/inicio/imgini8.jpg"} alt="Paisaje de Quilpué" width={1200} height={450} className="col-span-2 aspect-[16/6] w-full object-cover" unoptimized />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex items-center gap-4"><div className="section-label">Accesos principales</div><div className="h-px flex-1" style={{ background: "var(--border)" }} /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accessCards.map((card) => (
            <button key={card.title} type="button" onClick={() => router.push(card.href)} className="museum-card border p-6 text-left" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="mb-4 text-3xl">{card.icon}</div>
              <h3 className="mb-2 font-serif text-xl font-semibold" style={{ color: card.color }}>{card.title}</h3>
              <p className="text-sm leading-relaxed text-[#946541]">{card.description}</p>
              <div className="mt-4 font-mono text-[10px] tracking-wide uppercase" style={{ color: card.color }}>Ingresar →</div>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#bb9c82]/25 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between"><div><div className="section-label mb-1">Colección patrimonial</div><h2 className="font-serif text-3xl font-semibold text-[#946541]">Patrimonio destacado</h2></div><button type="button" onClick={() => router.push("/contenido?tipo=patrimonio")} className="btn-outline hidden px-3 py-2 md:flex">Ver todo el patrimonio</button></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {featuredPatrimonio.map((item) => <ContentCard key={item.id} item={item} router={router} />)}
          </div>
          {featuredPatrimonio.length === 0 && <p className="text-[#946541]">Aún no hay patrimonio publicado.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between"><div><div className="section-label mb-1">Publicaciones</div><h2 className="font-serif text-3xl font-semibold text-[#946541]">Últimas noticias</h2></div><button type="button" onClick={() => router.push("/contenido?tipo=noticia")} className="btn-outline hidden px-3 py-2 md:flex">Ver todas</button></div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {featuredNoticias.map((item) => <ContentCard key={item.id} item={item} router={router} compact />)}
        </div>
        {featuredNoticias.length === 0 && <p className="text-[#946541]">Aún no hay noticias publicadas.</p>}
      </section>

          {nextActivity && <section className="bg-[#bb9c82]/25 px-6 py-16"><div className="mx-auto max-w-7xl"><div className="mb-10 flex items-center gap-4"><div className="section-label">Próxima actividad</div><div className="h-px flex-1" style={{ background: "var(--border)" }} /><button type="button" onClick={() => router.push("/actividades?vista=calendario")} className="btn-outline hidden px-3 py-2 md:flex">Ver calendario</button></div><div className="grid grid-cols-1 overflow-hidden lg:grid-cols-2"><div className="relative min-h-[380px] bg-[#bb9c82]/30"><Image src={getImage(nextActivity.image)} alt={nextActivity.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" unoptimized={getImage(nextActivity.image).startsWith("/")} /><div className="absolute top-4 left-4 bg-[#ffdf90] px-3 py-1.5 font-mono text-[10px] tracking-wide text-[#946541] uppercase">Actividad</div></div><div className="flex flex-col justify-center border border-[#bb9c82] bg-[#e7dcd2] p-10"><div className="section-label mb-3">{formatDate(nextActivity.date)} · {nextActivity.time}</div><h2 className="mb-4 font-serif text-3xl font-semibold text-[#946541]">{nextActivity.title}</h2><p className="mb-5 text-sm leading-relaxed text-[#946541]">{nextActivity.description}</p><div className="mb-6 flex flex-wrap gap-4 text-sm text-[#946541]"><span>📍 {nextActivity.location}</span><span>👥 {nextActivity.cupos} cupos</span></div><button type="button" onClick={() => router.push("/actividades")} className="btn-primary self-start px-4 py-3">Ver actividades →</button></div></div></div></section>}

    </div>
  );
}

function ContentCard({ item, router, compact = false }) {
  return <button type="button" onClick={() => router.push(`/contenido?tipo=${item.tipo}`)} className={`museum-card group border text-left ${compact ? "flex gap-4 p-4" : ""}`} style={{ background: "var(--card)", borderColor: "var(--border)" }}><div className={compact ? "h-[90px] w-[120px] shrink-0 overflow-hidden" : "relative aspect-video overflow-hidden"}><Image src={getImage(item.image)} alt={item.title} width={1200} height={700} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={getImage(item.image).startsWith("/")} /></div><div className={compact ? "min-w-0 flex-1 p-0" : "p-5"}><div className="mb-2 flex items-center gap-2"><span className="bg-[#ffdf90] px-2 py-0.5 font-mono text-[9px] text-[#946541] uppercase">{item.tipo}</span><span className="font-mono text-[9px] text-[#946541]">{formatDate(item.date)}</span></div><h3 className="mb-2 font-serif text-xl leading-snug font-semibold text-[#946541]">{item.title}</h3><p className="line-clamp-2 text-sm leading-relaxed text-[#946541]">{item.description}</p></div></button>;
}
