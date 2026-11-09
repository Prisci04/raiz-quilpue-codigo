"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Send, RotateCcw, Sparkles } from "lucide-react";
import { useAssistant } from "./AssistantProvider";

const suggestions = ["¿Qué es Raíz Quilpué?", "¿Qué actividades puedo encontrar?", "Quiero conocer el museo"];
export default function ChatPanel({ compact = false, autoFocus = false }) {
  const { config, messages, busy, error, unavailable, send, clear, refresh } = useAssistant();
  const [input, setInput] = useState("");
  const id = useId();
  const list = useRef(null);
  const field = useRef(null);
  const disabled = !config?.activo || unavailable;
  useEffect(() => { if (autoFocus) field.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, busy]);
  async function submit(event) {
    event.preventDefault();
    const question = input;
    setInput("");
    const sent = await send(question);
    if (!sent) setInput((current) => current || question);
  }
  return (
    <div className={`ai-chat ${compact ? "ai-chat-compact" : ""}`} aria-label="Conversación con el asistente">
      <div className="ai-chat-toolbar">
        <span><Sparkles size={15} aria-hidden="true" /> Respuestas de demostración</span>
        <button type="button" className="ai-icon-button" aria-label="Nueva conversación" title="Nueva conversación"
          onClick={() => { clear(); setInput(""); field.current?.focus(); }}><RotateCcw size={17} aria-hidden="true" /></button>
      </div>
      <div ref={list} className="ai-messages" role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions">
        <div className="ai-message ai-message-assistant">
          <p className="ai-message-author">{config?.nombre || "Asistente Raíz"}</p>
          <p>{config ? config.activo ? config.mensaje_inicial : "El asistente no está disponible por ahora. Puedes seguir explorando el sitio." : "Preparando el asistente…"}</p>
        </div>
        {messages.map((item) => (
          <div key={item.id} className={`ai-message ai-message-${item.role}`}>
            <p className="ai-message-author">{item.role === "user" ? "Tú" : config?.nombre}</p>
            <p className="whitespace-pre-wrap">{item.content}</p>
            {item.sources?.length ? <ul className="ai-sources" aria-label="Información relacionada">{item.sources.map((source) => (
              /^\/(actividades|contenido|museo|quienes-somos)(\/\d+)?$/.test(source.href) ? <li key={source.href}><Link href={source.href}>{source.title}<ArrowUpRight size={14} aria-hidden="true" /></Link></li> : null
            ))}</ul> : null}
          </div>
        ))}
        {busy ? <p className="ai-thinking" role="status"><LoaderCircle className="motion-safe:animate-spin" size={17} aria-hidden="true" />Buscando información para ti…</p> : null}
      </div>
      {!messages.length && config?.activo && !unavailable ? <div className="ai-suggestions" aria-label="Ideas para comenzar">
        {suggestions.map((question) => <button key={question} type="button" disabled={busy} onClick={() => { setInput(question); field.current?.focus(); }}>{question}</button>)}
      </div> : null}
      {error ? <div className="ai-chat-error"><p role="alert">{error}</p>{unavailable ? <button type="button" onClick={() => refresh()}>Reintentar conexión</button> : null}</div> : null}
      {config?.activo === false && !unavailable ? <button type="button" className="min-h-11 px-4 text-left text-xs underline" onClick={() => refresh()}>Comprobar disponibilidad</button> : null}
      <form className="ai-composer" onSubmit={submit} aria-busy={busy}>
        <label htmlFor={id} className="sr-only">Tu pregunta</label>
        <div className="ai-input-row">
          <textarea ref={field} id={id} value={input} disabled={disabled || busy} maxLength={1200} rows={2}
            placeholder="Escribe tu pregunta…" aria-describedby={id + "-help"}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (input.trim() && !busy) event.currentTarget.form.requestSubmit(); } }} />
          <button type="submit" disabled={disabled || busy || !input.trim()} aria-label="Enviar pregunta"><Send size={19} aria-hidden="true" /></button>
        </div>
        <p id={id + "-help"} className="ai-chat-help">{input.length}/1200 · Enter envía; Mayús + Enter agrega una línea. No compartas datos personales.</p>
      </form>
    </div>
  );
}
