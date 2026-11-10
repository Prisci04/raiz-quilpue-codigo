import ChatPanel from "@/components/ai/ChatPanel";
import AnimatedContent from "@/components/motion/AnimatedContent";
import { Leaf, MapPin, Sparkles, ArrowDownRight } from "lucide-react";
import { AssistantMark } from "@/components/ai/AssistantIdentity";
import "@/components/ai/assistant.css";

export const metadata = { title: "Raíz Quilpué IA — Descubre Quilpué conversando", description: "Descubre la cultura, memoria y actividades de Quilpué con nuestro asistente." };
export default function AsistentePage() {
  return <main className="ai-chat-page">
    <div className="ai-experience">
      <header className="ai-page-header">
        <AnimatedContent className="ai-hero-brand" distance={20} duration={520}><AssistantMark /><span>Raíz Quilpué <b>IA</b></span></AnimatedContent>
        <div className="ai-hero-copy">
          <AnimatedContent as="p" className="ai-eyebrow" delay={60}>Una nueva forma de encontrarnos</AnimatedContent>
          <AnimatedContent as="h1" delay={120} distance={24} duration={560}>Descubre Quilpué <em>conversando.</em></AnimatedContent>
          <AnimatedContent as="p" className="ai-page-intro" delay={200}>Cultura, patrimonio, lugares y actividades. Acércate a las historias de nuestro territorio, una pregunta a la vez.</AnimatedContent>
        </div>
        <AnimatedContent className="ai-hero-bottom" delay={260}>
          <div className="ai-hero-art" aria-hidden="true"><Leaf strokeWidth={.7} /><Sparkles strokeWidth={1} /></div>
          <p><MapPin size={15} aria-hidden="true" /> Nuestras raíces, nuevas conexiones</p>
          <span>Cada conversación es un punto de partida.<ArrowDownRight size={22} aria-hidden="true" /></span>
        </AnimatedContent>
      </header>
      <AnimatedContent className="ai-conversation-surface" delay={100} duration={500}><ChatPanel /></AnimatedContent>
    </div>
    <p className="ai-page-note">Conversación temporal · Se borra al recargar o salir del sitio. Las respuestas usan información del portal; confirma fechas y detalles en las fichas relacionadas.</p>
  </main>;
}
