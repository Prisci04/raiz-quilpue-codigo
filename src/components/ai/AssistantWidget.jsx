"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import ChatPanel from "./ChatPanel";
import AssistantIdentity from "./AssistantIdentity";

export default function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { config, refresh } = useAssistant();
  const opener = useRef(null);
  const panel = useRef(null);
  const closing = useRef(false);
  const fullPage = pathname === "/asistente";
  async function closePanel() {
    if (closing.current) return;
    closing.current = true;
    if (panel.current?.animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await panel.current.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(8px) scale(.98)" }], { duration: 140, easing: "ease-in" }).finished.catch(() => {});
    }
    setOpen(false); closing.current = false; opener.current?.focus();
  }
  useEffect(() => {
    if (!open || fullPage) return;
    function keyDown(event) {
      if (event.key === "Escape" && panel.current?.contains(document.activeElement)) {
        event.preventDefault(); void closePanel();
      }
    }
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [open, fullPage]);
  if (fullPage || config?.activo === false) return null;
  return (
    <aside className={`ai-widget${open ? " is-open" : ""}`} aria-label="Asistente de Raíz Quilpué">
      {open ? <section ref={panel} id="assistant-widget-panel" className="ai-widget-panel" role="dialog" aria-label={config?.nombre || "Asistente Raíz"}>
        <header className="ai-widget-header">
          <AssistantIdentity />
          <button type="button" className="ai-icon-button" aria-label="Cerrar asistente" onClick={closePanel}><X size={20} aria-hidden="true" /></button>
        </header>
        <ChatPanel compact autoFocus />
        <Link href="/asistente" className="ai-widget-full">Abrir asistente completo<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section> : null}
      <button ref={opener} type="button" className="ai-widget-toggle" aria-expanded={open} aria-controls={open ? "assistant-widget-panel" : undefined}
        title={open ? "Minimizar conversación" : "Conversa con el asistente de Raíz Quilpué"}
        aria-label={open ? "Ocultar asistente" : "Abrir asistente"} onClick={() => { if (open) void closePanel(); else { setOpen(true); void refresh(); } }}>
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={23} aria-hidden="true" />}<span className="ai-widget-label">¿Te ayudamos?</span>
      </button>
    </aside>
  );
}
