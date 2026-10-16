"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import ActivityCard from "@/components/actividades/ActivityCard";
import AccessSection from "@/components/home/AccessSection";

const fallbackImage = "/images/inicio/imageninicio.jpg";

const heroSlides = [
  {
    // CAMBIAR IMAGEN AQUÍ: agrega aquí la primera foto histórica del inicio.
    image: "/images/inicio/imagen-carrusel1.jpg",
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

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
              <em className="text-[#e48d40]">dan forma</em>
              <br />
              a Quilpué
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-[#e7dcd2]/85 md:text-lg">
              Un espacio donde las historias mantienen vivas nuestras raíces.  

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
                <Search size={16} strokeWidth={2} aria-hidden="true" />
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
            <h2 className="mb-5 font-serif text-4xl leading-tight font-semibold text-[#946541]">Raíz Quilpué es una corporación cultural e histórica</h2>
            <p className="mb-4 text-base leading-relaxed text-[#946541]">Somos un espacio para encontrarnos con las historias, saberes, lugares, personas y expresiones que forman parte de nuestra identidad local, conectando el patrimonio con la comunidad y el territorio.</p>
            <p className="mb-6 text-base leading-relaxed text-[#946541]">Dedicada a investigar, rescatar, difundir y construir participativamente la memoria histórica y cultural de Quilpué.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => router.push("/quienes-somos")} className="btn-primary px-4 py-3">Conocer más</button>
              <button type="button" onClick={() => router.push("/museo")} className="btn-outline px-4 py-3">Explorar museo</button>
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

      <AccessSection contents={contents} activities={activities} />

      <section className="bg-[#bb9c82]/25 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="section-label mb-1">Publicaciones recientes</div>
              <h2 className="font-serif text-3xl font-semibold text-[#946541]">
                Últimos contenidos
              </h2>
            </div>
            <Link href="/contenido" className="btn-outline hidden px-3 py-2 md:flex">
              Ver todos
            </Link>
          </div>
          {contents.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {contents.slice(0, 3).map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-[#946541]">Aún no hay contenidos publicados.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="section-label mb-1">Encuentros y experiencias</div>
            <h2 className="font-serif text-3xl font-semibold text-[#946541]">
              Actividades recientes
            </h2>
          </div>
          <Link href="/actividades" className="btn-outline hidden px-3 py-2 md:flex">
            Ver todas
          </Link>
        </div>
        {activities.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.slice(0, 3).map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="text-[#946541]">Aún no hay actividades publicadas.</p>
        )}
      </section>

    </div>
  );
}

function ContentCard({ item }) {
  const image = item.image || fallbackImage;

  return (
    <Link
      href={`/contenido/${item.id}`}
      className="museum-card group block border text-left"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={image.startsWith("/")}
        />
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="bg-[#ffdf90] px-2 py-0.5 font-mono text-[9px] text-[#946541] uppercase">
            {item.tipo}
          </span>
          <span className="font-mono text-[9px] text-[#946541]">
            {formatDate(item.date || item.createdAt)}
          </span>
        </div>
        <h3 className="mb-2 font-serif text-xl leading-snug font-semibold text-[#946541]">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-[#946541]">
          {item.description}
        </p>
      </div>
    </Link>
  );
}
