import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import AnimatedContent from "@/components/motion/AnimatedContent";
import BackToTop from "./footer/BackToTop";
import "./footer/footer.css";

const links = [
  { label: "Inicio", href: "/" },
  { label: "Quiénes somos", href: "/quienes-somos" },
  { label: "Contenidos", href: "/contenido" },
  { label: "Actividades", href: "/actividades" },
  { label: "Museo Digital", href: "/museo" },
  { label: "Raíz Quilpué IA", href: "/asistente" },
];
const email = "https://mail.google.com/mail/?view=cm&fs=1&to=raizquilpue%40gmail.com";
function Instagram() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1.05" fill="currentColor" stroke="none" /></svg>;
}

export default function Footer() {
  return <footer className="site-footer rev1-footer" aria-label="Raíz Quilpué: enlaces y contacto">
    <div className="rev1-footer-inner">
      <div className="rev1-footer-heading">
        <AnimatedContent className="rev1-footer-identity" distance={18} duration={500}>
          <Link href="/" className="rev1-footer-brand" aria-label="Raíz Quilpué, inicio">
            <span className="rev1-footer-mark"><Image src="/images/logo/raiz-quilpue-isotipo.png" alt="Raíz Quilpué" width={2280} height={2304} sizes="(max-width: 639px) 112px, 136px" /></span>
          </Link>
          <p className="rev1-footer-territory">Cultura <span>·</span> Memoria <span>·</span> Territorio</p>
        </AnimatedContent>
        <AnimatedContent className="rev1-footer-story" delay={100} distance={18}>
          <p>Rescatando la memoria,<br /><em>construyendo comunidad.</em></p>
          <span>Fortaleciendo la identidad desde Quilpué.</span>
          <Link href="/quienes-somos">Conoce nuestra historia<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </AnimatedContent>
      </div>
      <div className="rev1-footer-content">
        <AnimatedContent as="nav" className="rev1-footer-nav" aria-label="Explorar Raíz Quilpué" delay={80}>
          <h2>Un territorio por descubrir</h2>
          <ul>{links.map((item, index) => <li key={item.href}><Link href={item.href}><span className="rev1-footer-index" aria-hidden="true">0{index + 1}</span>{item.label}<ArrowUpRight size={16} aria-hidden="true" /></Link></li>)}</ul>
        </AnimatedContent>
        <AnimatedContent as="section" className="rev1-footer-contact" aria-labelledby="rev1-footer-contact-title" delay={160}>
          <div className="rev1-footer-contact-top"><h2 id="rev1-footer-contact-title">Sigamos en contacto</h2><span aria-hidden="true">↗</span></div>
          <a href={email} target="_blank" rel="noreferrer" className="rev1-footer-email"><Mail size={18} aria-hidden="true" />raizquilpue@gmail.com</a>
          <div className="rev1-footer-contact-details"><a href="tel:+56939405350"><Phone size={16} aria-hidden="true" />+56 9 3940 5350</a><p><MapPin size={16} aria-hidden="true" />Quilpué, Región de Valparaíso, Chile</p></div>
          <a className="rev1-footer-social" href="https://www.instagram.com/raizquilpue/" target="_blank" rel="noreferrer"><Instagram size={18} aria-hidden="true" />Encuéntranos en Instagram<ArrowUpRight size={16} aria-hidden="true" /></a>
        </AnimatedContent>
      </div>
      <div className="rev1-footer-bottom"><p>© 2026 Raíz Quilpué · Todos los derechos reservados.</p><BackToTop /></div>
    </div>
  </footer>;
}
