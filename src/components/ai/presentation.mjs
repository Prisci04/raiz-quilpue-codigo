// Presentation only: never migrate the editable name or mutate API data.
export const AI_IDENTITY = "Raíz Quilpué IA";
export function assistantDisplayName(name) {
  return !name || name === "Asistente Raíz" ? AI_IDENTITY : name;
}
