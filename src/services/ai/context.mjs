import "server-only";

const STOP = new Set("que quien como cuando donde para del las los una uno unos unas por con sobre esta este esto ese esa hay son soy quiero saber conocer informacion puedes puedo encontrar gustaria favor hola gracias".split(" "));
export function searchTerms(message) {
  const terms = [...new Set(message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((word) => !STOP.has(word));
  const specific = terms.filter((word) => !["raiz", "quilpue"].includes(word));
  return (specific.length ? specific : terms).slice(0, 6);
}
export function plainText(value) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}
function normalized(value) { return plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
export function selectContext(message, documents, { limit = 5, budget = 3000 } = {}) {
  const terms = searchTerms(message);
  if (!terms.length) return [];
  const ranked = documents.filter((doc) => doc.activo !== false).map((doc, index) => {
    const heading = normalized(`${doc.titulo} ${doc.categoria ?? ""}`);
    const body = normalized(doc.contenido);
    const score = terms.reduce((sum, term) => sum + (heading.includes(term) ? 4 : 0) + (body.includes(term) ? 1 : 0), 0);
    return { doc, score, index };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || (a.doc.orden ?? 9999) - (b.doc.orden ?? 9999) || a.index - b.index);
  const context = [];
  for (const { doc } of ranked.slice(0, limit)) {
    if (budget < 100) break;
    const content = plainText(doc.contenido);
    // Prefer the passage containing a query term, rather than unrelated opening text.
    const position = Math.max(0, normalized(content).search(new RegExp(terms.join("|"))) - 100);
    const excerpt = content.slice(position, position + Math.min(650, budget));
    budget -= excerpt.length;
    context.push({ titulo: plainText(doc.titulo).slice(0, 160), contenido: excerpt,
      href: typeof doc.href === "string" && /^\/(actividades|contenido|museo|quienes-somos)(\/\d+)?$/.test(doc.href) ? doc.href : null,
      tipo: doc.tipo || "conocimiento" });
  }
  return context;
}
export async function retrieveContext(message, { knowledge, searchPublic }) {
  const terms = searchTerms(message);
  if (!terms.length) return { documents: [], partial: false };
  const [editorial, publicResults] = await Promise.allSettled([knowledge(), searchPublic(terms)]);
  // An unavailable editorial repository must never silently bypass deactivation/config.
  if (editorial.status === "rejected") throw editorial.reason;
  return { documents: selectContext(message, [...editorial.value, ...(publicResults.status === "fulfilled" ? publicResults.value : [])]),
    partial: publicResults.status === "rejected" };
}
