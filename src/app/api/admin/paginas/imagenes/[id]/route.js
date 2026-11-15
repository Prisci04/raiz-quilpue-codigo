import { jsonError } from "@/lib/http";
import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseId, parseImagenDescripcion } from "@/lib/paginas/validation.mjs";
import { actualizarImagen } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

/** Edita la descripción (pie de foto / texto alternativo) de una imagen. */
export async function PATCH(request, { params }) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/imagenes/[id]", async () => {
    const idImagen = parseId((await params).id, "La imagen");
    const descripcion = parseImagenDescripcion(await requireJsonBody(request));
    const imagen = await actualizarImagen(idImagen, descripcion);

    return imagen
      ? respuestaOk({ imagen })
      : jsonError(404, "NOT_FOUND", "Imagen no encontrada.");
  });
}
