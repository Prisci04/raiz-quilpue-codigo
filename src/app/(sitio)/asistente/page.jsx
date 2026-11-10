import ChatPanel from "@/components/ai/ChatPanel";
import AnimatedContent from "@/components/motion/AnimatedContent";
import { Leaf, MapPin } from "lucide-react";
import "@/components/ai/assistant.css";

export const metadata = { title: "Asistente — Raíz Quilpué", description: "Descubre la cultura, memoria y actividades de Quilpué con nuestro asistente." };
export default function AsistentePage() {
  return <main className="ai-chat-page">
    <AnimatedContent as="header" className="ai-page-header">
      <div><p className="ai-eyebrow"><Leaf size={15} aria-hidden="true" /> Un encuentro con nuestras raíces</p>
        <h1>Conversemos sobre Quilpué</h1>
        <p className="ai-page-intro">Un espacio para descubrir nuestro patrimonio, las actividades y las historias que nos conectan.</p>
      </div>
      <span className="ai-territory"><MapPin size={16} aria-hidden="true" /> Cultura local, cerca de ti</span>
    </AnimatedContent>
    <AnimatedContent><ChatPanel /></AnimatedContent>
    <p className="ai-page-note">Conversación temporal · Se borra al recargar o salir del sitio. Las respuestas usan información del portal; confirma fechas y detalles en las fichas relacionadas.</p>
  </main>;
}
