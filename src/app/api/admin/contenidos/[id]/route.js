import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { requireGestorContenido } from "@/lib/auth/guard";
import { ContenidoError } from "@/lib/contenidos/errors.mjs";
import {
  noStore,
  readContenidoBody,
  respondContenidoFailure,
} from "@/lib/contenidos/respond";
import {
  parseEstadoContenido,
  parseUpdateContenido,
} from "@/lib/contenidos/validation.mjs";
import { parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { listCatalogosContenido } from "@/services/catalogos.service";
import {
  actualizarContenido,
  cambiarEstadoContenido,
  eliminarContenido,
  obtenerContenidoAdmin,
} from "@/services/contenidos-admin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readId(params) {
  const { id: rawId } = await params;
  return parsePositiveInteger(rawId, { min: 1 });
}

function invalidId() {
  return noStore(jsonError(400, "VALIDATION", "El identificador no es válido."));
}

export async function GET(request, { params }) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return invalidId();
    }

    const contenido = await obtenerContenidoAdmin(parsedId.value);

    if (!contenido) {
      throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
    }

    return noStore(jsonSuccess(contenido));
  } catch (error) {
    return respondContenidoFailure(error, "GET /api/admin/contenidos/[id]");
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return invalidId();
    }

    const catalogos = await listCatalogosContenido();
    const body = await readContenidoBody(request);
    const soloEstado = body && Object.keys(body).length === 1 && "estado" in body;
    const parsed = soloEstado
      ? parseEstadoContenido(body, catalogos)
      : parseUpdateContenido(body, catalogos);

    if (!parsed.ok) {
      throw new ContenidoError("VALIDATION", parsed.message);
    }

    if (!soloEstado && parsed.value.imagen_url) {
      const owned = parseOwnedPortadaUrl(parsed.value.imagen_url);

      if (!owned || owned.contexto !== "contenidos" || owned.registroId !== parsedId.value) {
        throw new ContenidoError("VALIDATION", "La imagen de portada no es válida.");
      }
    }

    const contenido = soloEstado
      ? await cambiarEstadoContenido(parsedId.value, parsed.value.id_estado, catalogos)
      : await actualizarContenido(parsedId.value, parsed.value, catalogos);

    return noStore(jsonSuccess(contenido));
  } catch (error) {
    return respondContenidoFailure(error, "PATCH /api/admin/contenidos/[id]");
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return invalidId();
    }

    await eliminarContenido(parsedId.value);
    return noStore(jsonSuccess({ eliminado: true }));
  } catch (error) {
    return respondContenidoFailure(error, "DELETE /api/admin/contenidos/[id]");
  }
}
