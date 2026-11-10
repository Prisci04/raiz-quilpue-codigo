"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Send, RotateCcw, Sparkles } from "lucide-react";
import AnimatedContent from "@/components/motion/AnimatedContent";
import AssistantIdentity, { AssistantMark } from "./AssistantIdentity";
import { useAssistant } from "./AssistantProvider";
import { assistantDisplayName } from "./presentation.mjs";

const suggestions = ["¿Qué actividades hay disponibles?", "Cuéntame sobre Raíz Quilpué", "¿Qué puedo visitar?", "Muéstrame contenido cultural"];
export default function ChatPanel({ compact = false, autoFocus = false }) {
  const { config, messages, busy, error, unavailable, send, clear, refresh } = useAssistant();
  const [input, setInput] = useState("");
  const id = useId();
  const list = useRef(null);
  const field = useRef(null);
  const disabled = !config?.activo || unavailable;
  const name = assistantDisplayName(config?.nombre);
  useEffect(() => { if (autoFocus) field.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = messages.length ? element.scrollHeight : 0;
  }, [messages.length, busy]);
  async function submit(event) {
    event.preventDefault();
    if (disabled || busy || !input.trim()) return;
    const question = input;
    setInput("");
    const sent = await send(question);
    if (!sent) setInput((current) => current || question);
  }
  return (
    <div className={`ai-chat ${compact ? "ai-chat-compact" : ""}`} aria-label="Conversación con el asistente">
      <div className="ai-chat-toolbar">
        {compact ? <span className="ai-compact-caption">Un encuentro con nuestras raíces</span> : <AssistantIdentity />}
        <button type="button" className="ai-icon-button" aria-label="Nueva conversación" title="Nueva conversación"
          onClick={() => { clear(); setInput(""); field.current?.focus(); }}><RotateCcw size={17} aria-hidden="true" /></button>
      </div>
      <div ref={list} className="ai-messages" role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions">
        {!messages.length ? <div className="ai-welcome">
          <AssistantMark />
          <p className="ai-eyebrow">Cultura · Memoria · Territorio</p>
          <h2>¿Qué te gustaría descubrir?</h2>
          <p>Hay historias, lugares y actividades por descubrir. ¿Por dónde comenzamos?</p>
        </div> : null}
        <div className={`ai-message ai-message-assistant${!messages.length ? " ai-greeting" : ""}`}>
          <p className="ai-message-author">{name}</p>
          <p>{config ? config.activo ? config.mensaje_inicial : "El asistente no está disponible por ahora. Puedes seguir explorando el sitio." : "Preparando el asistente…"}</p>
        </div>
        {messages.map((item) => (
          <AnimatedContent key={item.id} duration={240} distance={8} className={`ai-message ai-message-${item.role}`}>
            <p className="ai-message-author">{item.role === "user" ? "Tú" : name}</p>
            <p className="whitespace-pre-wrap">{item.content}</p>
            {item.sources?.length ? <ul className="ai-sources" aria-label="Información relacionada">{item.sources.map((source) => (
              /^\/(actividades|contenido|museo|quienes-somos)(\/\d+)?$/.test(source.href) ? <li key={source.href}><Link href={source.href}>{source.title}<ArrowUpRight size={14} aria-hidden="true" /></Link></li> : null
            ))}</ul> : null}
          </AnimatedContent>
        ))}
        {busy ? <p className="ai-thinking" role="status"><LoaderCircle className="motion-safe:animate-spin" size={17} aria-hidden="true" />Buscando información para ti…</p> : null}
      {!messages.length && config?.activo && !unavailable ? <div className="ai-suggestions" aria-label="Ideas para comenzar">
        <p><Sparkles size={14} aria-hidden="true" /> Algunas ideas para ti</p>
        {suggestions.map((question, index) => <AnimatedContent as="button" key={question} delay={index * 65} distance={14} duration={360} type="button" disabled={busy} onClick={() => { setInput(question); field.current?.focus(); }}><span className="ai-suggestion-number" aria-hidden="true">0{index + 1}</span><span>{question}</span><ArrowUpRight size={15} aria-hidden="true" /></AnimatedContent>)}
      </div> : null}
      </div>
      {error ? <div className="ai-chat-error"><p role="alert">{error}</p>{unavailable ? <button type="button" onClick={() => refresh()}>Reintentar conexión</button> : null}</div> : null}
      {config?.activo === false && !unavailable ? <button type="button" className="min-h-11 px-4 text-left text-xs underline" onClick={() => refresh()}>Comprobar disponibilidad</button> : null}
      <form className="ai-composer" onSubmit={submit} aria-busy={busy}>
        <label htmlFor={id} className="sr-only">Tu pregunta</label>
        <div className="ai-input-row">
          <textarea ref={field} id={id} value={input} disabled={disabled || busy} maxLength={1200} rows={2}
            placeholder="Escribe tu pregunta…" aria-describedby={id + "-help"}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (input.trim() && !busy) event.currentTarget.form.requestSubmit(); } }} />
          <button type="submit" disabled={disabled || busy || !input.trim()} aria-label="Enviar pregunta">{busy ? <LoaderCircle className="motion-safe:animate-spin" size={19} aria-hidden="true" /> : <Send size={19} aria-hidden="true" />}</button>
        </div>
        <p id={id + "-help"} className="ai-chat-help">{input.length}/1200 · Enter envía; Mayús + Enter agrega una línea. No compartas datos personales.</p>
      </form>
    </div>
  );
}
