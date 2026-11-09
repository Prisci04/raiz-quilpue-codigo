"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import ChatPanel from "./ChatPanel";

export default function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { config, refresh } = useAssistant();
  const opener = useRef(null);
  const panel = useRef(null);
  const fullPage = pathname === "/asistente";
  useEffect(() => {
    if (!open || fullPage) return;
    function keyDown(event) {
      if (event.key === "Escape" && panel.current?.contains(document.activeElement)) {
        event.preventDefault(); setOpen(false); opener.current?.focus();
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
          <div><p className="font-serif text-lg">{config?.nombre || "Asistente Raíz"}</p><p className="text-xs opacity-80">Conoce nuestro territorio</p></div>
          <button type="button" className="ai-icon-button" aria-label="Cerrar asistente" onClick={() => { setOpen(false); opener.current?.focus(); }}><X size={20} aria-hidden="true" /></button>
        </header>
        <ChatPanel compact autoFocus />
        <Link href="/asistente" className="ai-widget-full">Abrir conversación completa<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section> : null}
      <button ref={opener} type="button" className="ai-widget-toggle" aria-expanded={open} aria-controls={open ? "assistant-widget-panel" : undefined}
        aria-label={open ? "Ocultar asistente" : "Abrir asistente"} onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }}>
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={23} aria-hidden="true" />}<span className="ai-widget-label">¿Te ayudamos?</span>
      </button>
    </aside>
  );
}
