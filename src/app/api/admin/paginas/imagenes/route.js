import { jsonSuccess } from "@/lib/http";
import { runPaginasAdmin } from "@/lib/paginas/http";
import { listBibliotecaImagenes } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

/** Imágenes ya registradas en el bucket público, disponibles para reutilizar. */
export async function GET(request) {
  return runPaginasAdmin(request, "GET /api/admin/paginas/imagenes", async () =>
    jsonSuccess({ imagenes: await listBibliotecaImagenes() }),
  );
}
