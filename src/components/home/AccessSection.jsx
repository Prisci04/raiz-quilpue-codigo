import Image from "next/image";
import AnimatedContent from "@/components/motion/AnimatedContent";
import Link from "next/link";
import { ArrowRight, CalendarDays, Landmark, Library, Newspaper } from "lucide-react";

const accessItems = [
  {
    title: "Patrimonio",
    description: "Historias, lugares y expresiones que forman parte del patrimonio de Quilpué.",
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
    description: "Noticias, proyectos y novedades vinculadas a Raíz Quilpué y al patrimonio local.",
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
    description: "Talleres, recorridos y actividades culturales para encontrarnos con nuestro territorio.",
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
    description: "Un espacio digital para conservar, compartir y descubrir las memorias y piezas que forman parte de Quilpué.",
    href: "/museo",
    cta: "Entrar al museo",
    image: "/images/contenido/reloj y vaca Quilpué -01.jpeg",
    imageAlt: "Fotografía patrimonial del reloj de Quilpué",
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
  };

  const museum = accessItems[3];
  return <section className="home-discover" aria-labelledby="accesos-heading">
    <div className="home-container">
      <AnimatedContent className="home-section-heading"><div><p className="home-eyebrow">02 / Accesos principales</p><h2 id="accesos-heading">Explora Raíz Quilpué<span aria-hidden="true">.</span></h2></div><p>Cuatro espacios para conocer el patrimonio, descubrir historias, participar en actividades y recorrer el museo digital de Quilpué.</p></AnimatedContent>
      <ul className="home-pathways">{accessItems.slice(0, 3).map((item, index) => {
        const countLabel = formatCount(counts[item.countKey], item.countSingular, item.countPlural);
        const Icon = item.icon;
        return <AnimatedContent as="li" key={item.href} delay={index * 80} distance={18}><Link href={item.href} className="home-pathway interactive-card">
          <div className="home-pathway-image"><Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 700px) 100vw, 33vw" className="home-image" /><span aria-hidden="true">0{index + 1}</span></div>
          <div className="home-pathway-title"><h3><Icon size={19} strokeWidth={1.5} aria-hidden="true" />{item.title}</h3>{countLabel ? <span>{countLabel}</span> : null}</div>
          <p>{item.description}</p><span className="home-pathway-cta">{item.cta}<ArrowRight size={18} aria-hidden="true" /></span>
        </Link></AnimatedContent>;
      })}</ul>
      <div className="home-museum" aria-labelledby="home-museum-heading">
        <AnimatedContent className="home-museum-photo" distance={20} duration={520}><Image src={museum.image} alt={museum.imageAlt} fill sizes="(max-width: 700px) 100vw, 55vw" className="home-image" /><span>Patrimonio · Quilpué</span></AnimatedContent>
        <div className="home-museum-copy"><AnimatedContent><p className="home-eyebrow">Museo Digital</p><h3 id="home-museum-heading">Un museo para <em>nuestras memorias.</em></h3></AnimatedContent><AnimatedContent delay={100}><p>{museum.description}</p></AnimatedContent><Link href={museum.href} className="home-button home-button-light">{museum.cta}<ArrowRight size={18} aria-hidden="true" /></Link><p className="home-museum-foot">Conservar. Compartir. Descubrir.</p></div>
      </div>
    </div>
  </section>;
}
