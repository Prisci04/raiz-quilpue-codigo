import { jsonError } from "@/lib/http";
import { MediaError } from "@/lib/media/errors.mjs";
import { inspectImageFile } from "@/lib/media/policy.mjs";
import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseId, parseImagenIntegrantePayload } from "@/lib/paginas/validation.mjs";
import { setImagenIntegrante, subirImagenIntegrante } from "@/services/paginas.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_ENCONTRADO = "Integrante no encontrado.";

/** Sube una fotografía nueva y la deja como foto del integrante. */
export async function POST(request, { params }) {
  return runPaginasAdmin(request, "POST /api/admin/paginas/integrantes/[id]/imagen", async () => {
    const id = parseId((await params).id, "El integrante");
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      throw new MediaError(400, "INVALID_FILE", "El archivo no es válido.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectImageFile({ bytes, type: file.type, name: file.name, size: file.size });

    if (!inspected.ok) {
      throw new MediaError(inspected.status, inspected.code, inspected.message);
    }

    const items = await subirImagenIntegrante(id, {
      bytes,
      mime: inspected.mime,
      extension: inspected.extension,
    });

    return items ? respuestaOk({ items }, 201) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}

/** Asigna una imagen de la biblioteca como foto (`{ id_imagen }`) o la quita (`{ id_imagen: null }`). */
export async function PATCH(request, { params }) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/integrantes/[id]/imagen", async () => {
    const id = parseId((await params).id, "El integrante");
    const idImagen = parseImagenIntegrantePayload(await requireJsonBody(request));
    const items = await setImagenIntegrante(id, idImagen);

    return items ? respuestaOk({ items }) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}
