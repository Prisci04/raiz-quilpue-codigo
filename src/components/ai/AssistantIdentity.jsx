"use client";

import { Leaf } from "lucide-react";
import { useAssistant } from "./AssistantProvider";

export function AssistantMark() {
  return <span className="ai-mark" aria-hidden="true"><Leaf size={23} strokeWidth={1.6} /></span>;
}

export default function AssistantIdentity() {
  const { config, unavailable } = useAssistant();
  const available = config?.activo && !unavailable;
  return <div className="ai-identity">
    <AssistantMark />
    <div><p className="ai-identity-name">{config?.nombre || "Asistente Raíz"}</p>
      <p className={`ai-availability${available ? " is-available" : ""}`}><span aria-hidden="true" />{unavailable ? "Sin conexión" : !config ? "Preparando el asistente…" : available ? "Disponible para conversar" : "No disponible por ahora"}</p>
    </div>
  </div>;
}
