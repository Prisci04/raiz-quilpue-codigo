import { MediaError } from "@/lib/media/errors.mjs";
import { inspectImageFile } from "@/lib/media/policy.mjs";
import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import {
  parseDescripcionFormulario,
  parseId,
  parseImagenesSeccionPayload,
  parsePaginaId,
  parseSeccionCodigo,
} from "@/lib/paginas/validation.mjs";
import { setImagenesSeccion, subirImagenSeccion } from "@/services/paginas.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sube una imagen nueva y la agrega al final de la sección. */
export async function POST(request, { params }) {
  return runPaginasAdmin(
    request,
    "POST /api/admin/paginas/[id]/secciones/[codigo]/imagenes",
    async () => {
      const { id, codigo } = await params;
      const idPagina = parsePaginaId(id);
      const seccion = parseSeccionCodigo(idPagina, codigo);
      const form = await request.formData();
      const file = form.get("file");
      const reemplazo = form.get("reemplazar");

      if (!file || typeof file.arrayBuffer !== "function") {
        throw new MediaError(400, "INVALID_FILE", "El archivo no es válido.");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspected = inspectImageFile({
        bytes,
        type: file.type,
        name: file.name,
        size: file.size,
      });

      if (!inspected.ok) {
        throw new MediaError(inspected.status, inspected.code, inspected.message);
      }

      const imagenes = await subirImagenSeccion(idPagina, seccion, {
        bytes,
        mime: inspected.mime,
        extension: inspected.extension,
        descripcion: parseDescripcionFormulario(form.get("descripcion")),
        reemplazarId: reemplazo ? parseId(reemplazo, "La imagen a reemplazar") : null,
      });

      return respuestaOk({ imagenes }, 201);
    },
  );
}

/** Define las imágenes de la sección y su orden (asociar, reordenar, reemplazar, quitar). */
export async function PATCH(request, { params }) {
  return runPaginasAdmin(
    request,
    "PATCH /api/admin/paginas/[id]/secciones/[codigo]/imagenes",
    async () => {
      const { id, codigo } = await params;
      const idPagina = parsePaginaId(id);
      const seccion = parseSeccionCodigo(idPagina, codigo);
      const ids = parseImagenesSeccionPayload(await requireJsonBody(request), seccion);

      return respuestaOk({ imagenes: await setImagenesSeccion(idPagina, seccion, ids) });
    },
  );
}
