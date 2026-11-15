import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { PAGINA_INICIO, getPagina } from "@/lib/paginas/estructura.mjs";
import PaginasPanel from "@/components/admin/paginas/PaginasPanel";
import { getPaginaEdicion } from "@/services/paginas.service";

export const metadata = { title: "Páginas del sitio — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminPaginasPage({ searchParams }) {
  await requireGestorContenidoPage();

  const { pagina } = (await searchParams) ?? {};
  const requested = Number(Array.isArray(pagina) ? pagina[0] : pagina);
  const idPagina = getPagina(requested) ? requested : PAGINA_INICIO;
  let data = null;
  let error = "";

  try {
    data = await getPaginaEdicion(idPagina);
  } catch {
    console.error("[admin/paginas] No se pudo leer el contenido de la página");
    error = "No fue posible cargar el contenido. Inténtalo nuevamente en unos minutos.";
  }

  return <PaginasPanel idPagina={idPagina} data={data} error={error} />;
}
