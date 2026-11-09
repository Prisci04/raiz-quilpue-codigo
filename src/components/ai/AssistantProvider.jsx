"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AssistantContext = createContext(null);
export async function aiRequest(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options.headers }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const error = new Error(body?.error?.message || "No pudimos conectar con el asistente. Inténtalo de nuevo.");
    error.code = body?.error?.code; throw error;
  }
  return body.data;
}

// One in-memory conversation for the full chat and widget. No browser/DB persistence.
export function AssistantProvider({ children, preview = false }) {
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const pending = useRef(null);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const configPath = preview ? "/api/admin/ia/configuracion" : "/api/ia/configuracion";
  const loadConfig = useCallback((signal) => {
    return aiRequest(configPath, { signal }).then((next) => {
      if (!signal?.aborted && mounted.current) { setConfig(next); setConfigError(""); }
    }).catch((failure) => {
      if (failure.name !== "AbortError" && mounted.current) setConfigError(failure.message);
    });
  }, [configPath]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void loadConfig(controller.signal);
    return () => { mounted.current = false; controller.abort(); pending.current?.abort(); };
  }, [loadConfig]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { if (!document.hidden) void loadConfig(controller.signal); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [loadConfig]);

  function clear() {
    sequence.current++; pending.current?.abort(); pending.current = null;
    setMessages([]); setBusy(false); setError("");
  }
  async function send(text) {
    const message = text.trim();
    if (!message || message.length > 1200 || pending.current || !config?.activo || configError) return false;
    const controller = new AbortController();
    const current = ++sequence.current;
    pending.current = controller; setBusy(true); setError("");
    const history = messages.slice(-4).map(({ role, content }) => ({ role, content }));
    const userMessage = { id: `user-${current}`, role: "user", content: message };
    setMessages((items) => [...items.slice(-22), userMessage]);
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await aiRequest(preview ? "/api/admin/ia/probar" : "/api/ia/chat", {
        method: "POST", signal: controller.signal, body: JSON.stringify({ message, history }),
      });
      if (current === sequence.current && mounted.current) setMessages((items) => [...items, { id: `answer-${current}`, role: "assistant", content: result.answer, sources: result.sources }]);
    } catch (failure) {
      if (current === sequence.current && mounted.current) {
        setError(failure.name === "AbortError" ? "La consulta tardó demasiado. Puedes volver a enviarla." : failure.message);
        if (failure.code === "AI_DISABLED") setConfig((value) => ({ ...value, activo: false }));
        // Keep the question in the input for retry; don't leave an unanswered duplicate.
        setMessages((items) => items.filter((item) => item.id !== userMessage.id));
        return false;
      }
    } finally {
      clearTimeout(timer);
      if (current === sequence.current) { pending.current = null; if (mounted.current) setBusy(false); }
    }
    return true;
  }
  return <AssistantContext.Provider value={{ config, messages, busy, error: configError || error, unavailable: Boolean(configError), send, clear, refresh: loadConfig }}>{children}</AssistantContext.Provider>;
}
export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("AssistantProvider is required");
  return value;
}
