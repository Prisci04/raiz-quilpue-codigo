import ChatPanel from "@/components/ai/ChatPanel";
import "@/components/ai/assistant.css";

export const metadata = { title: "Asistente — Raíz Quilpué", description: "Descubre la cultura, memoria y actividades de Quilpué con nuestro asistente." };
export default function AsistentePage() {
  return <main className="ai-chat-page mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
    <p className="section-label mb-3">Un encuentro con nuestras raíces</p>
    <h1 className="font-serif text-4xl text-[#704a31] sm:text-5xl">Conversemos sobre Quilpué</h1>
    <p className="ai-page-intro mt-4 mb-7 max-w-2xl text-sm leading-7">Pregunta por Raíz Quilpué, su patrimonio y las actividades de la comunidad. Las respuestas se basan en la información disponible en el sitio.</p>
    <ChatPanel />
    <p className="mt-4 text-xs leading-6">Esta conversación es temporal y se borra al recargar o salir del sitio. Confirma fechas y detalles en las fichas relacionadas.</p>
  </main>;
}
