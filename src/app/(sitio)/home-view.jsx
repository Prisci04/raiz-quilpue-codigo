"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Leaf, MapPin, Pause, Play, Search, Sparkles } from "lucide-react";
import AnimatedContent from "@/components/motion/AnimatedContent";
import { splitParagraphs, splitTitleLines } from "@/lib/paginas/text.mjs";
import ActivityCard from "@/components/actividades/ActivityCard";
import AccessSection from "@/components/home/AccessSection";
import "@/components/home/home-rev1.css";

const fallbackImage = "/images/inicio/imageninicio.jpg";

const fallbackHeroSlides = [
  {
    // CAMBIAR IMAGEN AQUÍ: agrega aquí la primera foto histórica del inicio.
    image: "/images/inicio/imagen-carrusel1.jpg",
    caption: "Encuentro musical en Quilpué",
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

export default function HomeView({ page = null, contents = [], activities = [] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const portada = page?.secciones?.portada;
  const presentacion = page?.secciones?.presentacion;
  const heroSlides = portada?.imagenes?.length
    ? portada.imagenes.map((item) => ({ image: item.url, caption: item.descripcion || "", id: item.id }))
    : fallbackHeroSlides;
  const activeSlide = slide % heroSlides.length;
  const title = splitTitleLines(portada?.campos?.titulo);
  const paragraphs = splitParagraphs(presentacion?.campos?.contenido);
  const collage = (index, fallback, alt) => {
    const item = presentacion?.imagenes?.[index];
    return { src: item?.url || fallback, alt: item?.descripcion || alt };
  };


  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer;
    function schedule() {
      clearInterval(timer);
      if (!paused && !preference.matches) {
        timer = setInterval(() => setSlide((current) => (current + 1) % heroSlides.length), 5000);
      }
    }
    schedule();
    preference.addEventListener("change", schedule);
    return () => { clearInterval(timer); preference.removeEventListener("change", schedule); };
  }, [paused, heroSlides.length]);

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
    <main className="rev1-home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <AnimatedContent className="home-eyebrow" distance={18}><Leaf size={16} aria-hidden="true" /> {portada?.campos?.texto_superior ?? "Cultura · Memoria · Territorio"}</AnimatedContent>
            <AnimatedContent as="h1" id="home-hero-title" delay={100} distance={24} duration={560}>{title.lines.length ? title.lines.map((line, index) => index === title.emphasisIndex ? <em key={index}>{line}</em> : <span key={index} style={{ display: "block" }}>{line}</span>) : <>Historias que <em>dan forma</em> a Quilpué<span aria-hidden="true">.</span></>}</AnimatedContent>
            <AnimatedContent as="p" className="home-hero-description" delay={180}>{portada?.campos?.descripcion ?? "Un espacio donde las historias mantienen vivas nuestras raíces."}</AnimatedContent>
            <AnimatedContent className="home-hero-actions" delay={240}>
              <Link className="home-button home-button-dark" href="/museo">Explorar museo<ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link className="home-text-link" href="/actividades">Conocer actividades<ArrowUpRight size={17} aria-hidden="true" /></Link>
            </AnimatedContent>
            <AnimatedContent delay={280} className="home-search-area">
              <form onSubmit={handleSearch} className="home-search" role="search">
                <label htmlFor="home-patrimonio-search" className="sr-only">Buscar en el patrimonio de Quilpué</label>
                <Search size={17} aria-hidden="true" />
                <input id="home-patrimonio-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué historia quieres descubrir?" />
                <button type="submit" aria-label="Buscar"><ArrowUpRight size={21} aria-hidden="true" /></button>
              </form>
              <p>Historias, patrimonio y encuentros de nuestro territorio.</p>
            </AnimatedContent>
          </div>
          <AnimatedContent className="home-hero-gallery" delay={100} distance={18} duration={600}>
            <div className="home-hero-photo">
              {heroSlides.map((item, index) => <div key={item.id || item.image} className="home-slide" aria-hidden={activeSlide !== index} style={{ opacity: activeSlide === index ? 1 : 0 }}>
                <Image src={item.image} alt={item.caption} fill priority={index === 0} sizes="(max-width: 700px) 100vw, 55vw" className="home-slide-image" unoptimized />
              </div>)}
              <div className="home-photo-shade" aria-hidden="true" />
              <span className="home-photo-label"><MapPin size={14} aria-hidden="true" /> Quilpué, Chile</span>
              <div className="home-photo-caption"><span>Una mirada a nuestro territorio</span><p>{heroSlides[activeSlide].caption}</p></div>
            </div>
            <div className="home-gallery-controls">
              <span className="home-slide-number" aria-hidden="true">0{activeSlide + 1}<small> / 0{heroSlides.length}</small></span>
              <div className="home-slide-buttons">
                {heroSlides.map((item, index) => <button key={item.id || item.image} type="button" aria-label={"Ver imagen " + (index + 1)} aria-pressed={activeSlide === index} onClick={() => setSlide(index)}><span /></button>)}
                <button type="button" aria-label={paused ? "Reanudar imágenes" : "Pausar imágenes"} aria-pressed={paused} onClick={() => setPaused((value) => !value)} className="home-pause">{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>
              </div>
            </div>
          </AnimatedContent>
        </div>
        <div className="home-hero-foot"><a href="#home-comunidad">Encuentra nuestras raíces<ArrowDown size={15} aria-hidden="true" /></a><span>Museo Digital · Quilpué, Chile</span></div>
      </section>

      <div className="home-stats" aria-label="Raíz Quilpué en cifras"><div className="home-container home-stats-inner">
        {[{ label: "Comienzo", value: "2026" }, { label: "Años de historia", value: "1" }, { label: "Actividades publicadas", value: String(activities.length) }, { label: "Contenidos publicados", value: String(contents.length) }].map((stat, index) => <AnimatedContent key={stat.label} delay={index * 65} className="home-stat"><strong>{stat.value}</strong><span>{stat.label}</span></AnimatedContent>)}
      </div></div>

      <section className="home-about home-container" id="home-comunidad" aria-labelledby="home-about-heading">
        <AnimatedContent className="home-about-gallery" distance={20}>
          <figure><Image src={collage(0, '/images/inicio/imgini5.jpg', 'Comunidad de Raíz Quilpué en el Centro Cultural Daniel de la Vega').src} alt={collage(0, '/images/inicio/imgini5.jpg', 'Comunidad de Raíz Quilpué en el Centro Cultural Daniel de la Vega').alt} fill sizes="(max-width: 700px) 65vw, 35vw" className="home-image" unoptimized /></figure>
          <figure><Image src={collage(1, '/images/inicio/imgini6.jpg', '¿Qué significa Quilpué para ti? Una invitación a compartir recuerdos').src} alt={collage(1, '/images/inicio/imgini6.jpg', '¿Qué significa Quilpué para ti? Una invitación a compartir recuerdos').alt} fill sizes="(max-width: 700px) 35vw, 20vw" className="home-image" unoptimized /></figure>
          <figure><Image src={collage(2, '/images/inicio/imgini8.jpg', 'Participación de la comunidad en una actividad de memoria local').src} alt={collage(2, '/images/inicio/imgini8.jpg', 'Participación de la comunidad en una actividad de memoria local').alt} fill sizes="(max-width: 700px) 35vw, 20vw" className="home-image" unoptimized /></figure>
          <p className="home-gallery-caption">Historias, saberes y personas que nos conectan.</p>
        </AnimatedContent>
        <div className="home-about-copy">
          <AnimatedContent as="p" className="home-eyebrow">{presentacion?.campos?.texto_superior ?? "01 / Nuestras raíces"}</AnimatedContent>
          <AnimatedContent as="h2" id="home-about-heading" delay={70}>{presentacion?.campos?.titulo ?? <>La memoria se construye <em>en comunidad.</em></>}</AnimatedContent>
          <AnimatedContent delay={130}>{presentacion ? paragraphs.map((text, index) => <p key={index} className={index === 0 ? "home-about-lead" : undefined}>{text}</p>) : <><p className="home-about-lead">Raíz Quilpué es una corporación cultural e histórica.</p><p>Somos un espacio para encontrarnos con las historias, saberes, lugares, personas y expresiones que forman parte de nuestra identidad local, conectando el patrimonio con la comunidad y el territorio.</p><p>Dedicada a investigar, rescatar, difundir y construir participativamente la memoria histórica y cultural de Quilpué.</p></>}</AnimatedContent>
          <Link href="/quienes-somos" className="home-text-link">Conocer más<ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <AccessSection contents={contents} activities={activities} />

      <section className="home-journal home-container" aria-labelledby="home-journal-heading">
        <div className="home-section-heading"><AnimatedContent><p className="home-eyebrow">03 / Publicaciones recientes</p><h2 id="home-journal-heading">Historias para <em>seguir descubriendo.</em></h2><p>Últimos contenidos de nuestro territorio.</p></AnimatedContent><Link href="/contenido" className="home-text-link">Ver todos los contenidos<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        {contents.length ? <div className={"home-story-grid" + (contents.length > 1 ? " has-featured" : "")}>
          {contents.slice(0, 3).map((item, index) => <AnimatedContent as="article" key={item.id} className={index === 0 ? "home-story home-story-lead" : "home-story"} delay={index * 80} distance={18}><ContentCard item={item} featured={index === 0} /></AnimatedContent>)}
        </div> : <div className="home-empty"><p>Aún no hay contenidos publicados.</p><Link href="/contenido" className="home-text-link">Explorar contenidos<ArrowUpRight size={17} aria-hidden="true" /></Link></div>}
      </section>

      <section className="home-activities" aria-labelledby="home-activities-heading"><div className="home-container">
        <div className="home-section-heading"><AnimatedContent><p className="home-eyebrow">04 / Encuentros y experiencias</p><h2 id="home-activities-heading">La cultura <em>se vive.</em></h2><p>Actividades recientes para encontrarnos con nuestra comunidad.</p></AnimatedContent><Link href="/actividades" className="home-text-link">Ver todas las actividades<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        {activities.length ? <div className={"home-activity-grid" + (activities.length >= 3 ? " has-featured" : "")}>
          {activities.slice(0, 3).map((activity, index) => <AnimatedContent as="article" key={activity.id} className="home-activity-card" delay={index * 80} distance={18}><ActivityCard activity={activity} headingAs="h3" /></AnimatedContent>)}
        </div> : <div className="home-empty"><p>Aún no hay actividades publicadas.</p><Link href="/actividades" className="home-text-link">Explorar actividades<ArrowUpRight size={17} aria-hidden="true" /></Link></div>}
      </div></section>

      <section className="home-assistant home-container" aria-labelledby="home-assistant-heading"><AnimatedContent className="home-assistant-inner">
        <div className="home-assistant-mark" aria-hidden="true"><Leaf size={35} strokeWidth={1.2} /><Sparkles size={16} /></div>
        <div><p className="home-eyebrow">Raíz Quilpué IA</p><h2 id="home-assistant-heading">Descubre Quilpué conversando.</h2><p>Una pregunta puede ser el comienzo de un nuevo encuentro con nuestras raíces.</p></div>
        <Link href="/asistente" className="home-text-link">Iniciar conversación<ArrowUpRight size={19} aria-hidden="true" /></Link>
      </AnimatedContent></section>
    </main>
  );
}

function ContentCard({ item, featured }) {
  const image = item.image || fallbackImage;
  return <Link href={"/contenido/" + item.id} className="home-story-link interactive-card">
    <div className="home-story-image"><Image src={image} alt={item.title} fill sizes={featured ? "(max-width: 700px) 100vw, 55vw" : "(max-width: 700px) 35vw, 20vw"} className="home-image" unoptimized={image.startsWith("/")} /><span aria-hidden="true"><ArrowUpRight size={22} /></span></div>
    <div className="home-story-copy"><div className="home-story-meta"><span>{item.tipo}</span><time>{formatDate(item.date || item.createdAt)}</time></div><h3>{item.title}</h3><p>{item.description}</p><span className="home-story-cta">Leer historia<ArrowUpRight size={16} aria-hidden="true" /></span></div>
  </Link>;
}
