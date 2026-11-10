"use client";

import { Leaf, Sparkles } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import { AI_IDENTITY, assistantDisplayName } from "./presentation.mjs";

export function AssistantMark() {
  return <span className="ai-mark" aria-hidden="true"><Leaf size={25} strokeWidth={1.5} /><Sparkles className="ai-mark-spark" size={13} strokeWidth={1.8} /></span>;
}

export default function AssistantIdentity() {
  const { config, unavailable } = useAssistant();
  const available = config?.activo && !unavailable;
  const name = assistantDisplayName(config?.nombre);
  return <div className="ai-identity">
    <AssistantMark />
    <div><p className="ai-identity-name">{AI_IDENTITY}</p>
      {name !== AI_IDENTITY ? <p className="ai-custom-name">{name}</p> : null}
      <p className={`ai-availability${available ? " is-available" : ""}`}><span aria-hidden="true" />{unavailable ? "Sin conexión" : !config ? "Preparando el asistente…" : available ? "Disponible para conversar" : "No disponible por ahora"}</p>
    </div>
  </div>;
}
