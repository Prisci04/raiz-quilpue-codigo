"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const featured = [
  {
    id: 1,
    title: "Patrimonio de la plaza de Quilpué",
    category: "Historia",
    date: "2026-09-12",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Recorremos relatos, fotografías y testimonios que reconstruyen la vida cotidiana de la plaza y su gente.",
    href: "/noticias",
  },
  {
    id: 2,
    title: "Memoria oral de familias quilpueinas",
    category: "Testimonios",
    date: "2026-09-05",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Espacios para escuchar historias de barrio, trabajo, comunidad y raíces vivas en la ciudad.",
    href: "/patrimonio",
  },
  {
    id: 3,
    title: "Arquitectura y paisaje de Quilpué",
    category: "Urbanismo",
    date: "2026-08-30",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    excerpt: "Un recorrido visual por los edificios, calles y paisajes que marcan la identidad local.",
    href: "/calendario",
  },
];

const nextActivity = {
  title: "Visita guiada al Museo de la Memoria",
  category: "Actividad",
  date: "18 de septiembre",
  time: "18:30 hrs",
  description:
    "Recorridos guiados con relatos históricos, fotografías antiguas y acercamiento a la memoria urbana de Quilpué.",
  location: "Centro Cultural Quilpué",
  capacity: 35,
  enrolled: 12,
  image:
    "https://images.unsplash.com/photo-1501876725168-00c445821c9e?auto=format&fit=crop&w=1200&q=80",
};

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function navigate(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    router.push(normalizedPath);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      navigate("/noticias");
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative h-screen min-h-[600px] flex items-end pb-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1528569937393-ee892b976859?w=1800&h=1000&fit=crop&auto=format)`,
            filter: "sepia(30%) saturate(80%)",
          }}
        />
        <div className="hero-overlay absolute inset-0" />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl animate-fade-up">
            <div className="section-label mb-4">Museo Digital · Quilpué, Chile</div>
            <h1
              className="font-serif text-5xl md:text-7xl font-light leading-[1.1] mb-6 text-white"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
            >
              Historias que
              <br />
              <em style={{ color: "var(--accent)", fontStyle: "italic" }}>construyen</em>
              <br />
              nuestra memoria
            </h1>
            <p
              className="text-base md:text-lg leading-relaxed mb-8 max-w-xl"
              style={{ color: "rgba(244,239,230,0.85)", fontFamily: "Source Sans 3, sans-serif" }}
            >
              Un espacio para descubrir, preservar y compartir la historia,
              cultura y patrimonio de Quilpué.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-0 max-w-lg">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en el patrimonio de Quilpué..."
                className="flex-1 px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(244,239,230,0.95)",
                  color: "var(--foreground)",
                  fontFamily: "Source Sans 3, sans-serif",
                }}
              />
              <button type="submit" className="btn-primary px-5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>
          </div>

          {/* Stats bar */}
          <div
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px max-w-3xl animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            {[
              { label: "Piezas en museo", value: "200+" },
              { label: "Años de historia", value: "125" },
              { label: "Actividades 2026", value: "38" },
              { label: "Miembros activos", value: "1.2K" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-4 py-3"
                style={{ background: "rgba(44,26,14,0.6)", backdropFilter: "blur(4px)" }}
              >
                <div className="font-serif font-bold text-2xl text-white">{s.value}</div>
                <div
                  className="font-mono text-[9px] tracking-wide uppercase mt-0.5"
                  style={{ color: "rgba(244,239,230,0.55)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40">Explorar</span>
          <div className="w-px h-8 bg-white/20 animate-pulse" />
        </div>
      </section>

      {/* Quick access */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="section-label">Accesos principales</div>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "🏛️",
              title: "Museo Digital",
              desc: "Explora fotografías, documentos y objetos históricos",
              page: "/patrimonio",
              color: "var(--primary)",
            },
            {
              icon: "📰",
              title: "Contenidos",
              desc: "Noticias, patrimonio e historias de Quilpué",
              page: "/noticias",
              color: "var(--terracotta)",
            },
            {
              icon: "📅",
              title: "Actividades",
              desc: "Talleres, conferencias y visitas guiadas",
              page: "/actividades",
              color: "var(--accent)",
            },
            {
              icon: "🗓️",
              title: "Calendario",
              desc: "Eventos y actividades del calendario cultural",
              page: "/calendario",
              color: "var(--forest)",
            },
          ].map((card) => (
            <button
              key={card.page}
              type="button"
              onClick={() => navigate(card.page)}
              className="museum-card text-left p-6 border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3
                className="font-serif text-xl font-semibold mb-2"
                style={{ color: card.color }}
              >
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {card.desc}
              </p>
              <div
                className="mt-4 flex items-center gap-1 font-mono text-[10px] tracking-wide uppercase"
                style={{ color: card.color }}
              >
                Ingresar
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Latest contents */}
      <section style={{ background: "var(--secondary)" }} className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="section-label mb-1">Últimas publicaciones</div>
              <h2 className="font-serif text-3xl font-semibold" style={{ color: "var(--primary)" }}>
                Contenidos recientes
              </h2>
            </div>
            <button type="button" onClick={() => navigate("/noticias")} className="btn-outline hidden md:flex">
              Ver todo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featured.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.href)}
                className="museum-card text-left group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="overflow-hidden" style={{ aspectRatio: "16/9", background: "var(--muted)" }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5" style={{ background: "var(--card)", border: "1px solid var(--border)", borderTop: "none" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="font-mono text-[9px] tracking-[0.12em] uppercase px-2 py-0.5"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      {item.category}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(item.date).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold leading-snug mb-2" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                    {item.excerpt}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 md:hidden">
            <button type="button" onClick={() => navigate("/noticias")} className="btn-outline w-full text-center">
              Ver todos los contenidos
            </button>
          </div>
        </div>
      </section>

      {/* Featured activity */}
      {nextActivity && (
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <div className="section-label">Próxima actividad</div>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
            <div className="relative" style={{ minHeight: "400px", background: "var(--muted)" }}>
              <img
                src={nextActivity.image}
                alt={nextActivity.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute top-4 left-4 font-mono text-[10px] tracking-wide uppercase px-3 py-1.5"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {nextActivity.category}
              </div>
            </div>
            <div
              className="p-10 flex flex-col justify-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="section-label mb-3">
                {nextActivity.date} · {nextActivity.time}
              </div>
              <h2 className="font-serif text-3xl font-semibold mb-4" style={{ color: "var(--primary)" }}>
                {nextActivity.title}
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted-foreground)" }}>
                {nextActivity.description}
              </p>
              <div className="flex items-center gap-4 mb-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <span>📍 {nextActivity.location}</span>
                <span>👥 {nextActivity.capacity - nextActivity.enrolled} cupos disponibles</span>
              </div>
              <button type="button" onClick={() => navigate("/actividades")} className="btn-primary self-start">
                Ver actividades
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Mission strip */}
      <section className="py-20 px-6" style={{ background: "var(--primary)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="divider-gold mx-auto mb-8" style={{ maxWidth: "80px" }} />
          <blockquote
            className="font-serif text-3xl md:text-4xl font-light leading-relaxed italic"
            style={{ color: "var(--background)" }}
          >
            "Preservar la memoria es un acto de amor hacia quienes vendrán."
          </blockquote>
          <cite className="block mt-6 font-mono text-xs tracking-[0.15em] uppercase" style={{ color: "var(--accent)" }}>
            — Raíz Quilpué · Museo Digital
          </cite>
          <div className="divider-gold mx-auto mt-8" style={{ maxWidth: "80px" }} />
        </div>
      </section>
    </div>
  );
}