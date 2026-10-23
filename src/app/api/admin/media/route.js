import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { requireGestorContenido } from "@/lib/auth/guard";
import { MediaError } from "@/lib/media/errors.mjs";
import {
  buildObjectPath,
  inspectImageFile,
  mediaTarget,
  parseOwnedPortadaUrl,
} from "@/lib/media/policy.mjs";
import { noStore } from "@/lib/contenidos/respond";
import { getActividadAdmin, getPiezaMuseoAdmin } from "@/services/admin-community.service";
import { obtenerContenidoAdmin } from "@/services/contenidos-admin.service";
import { deleteImage, uploadImage } from "@/services/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mediaFailure(error, context) {
  if (error instanceof MediaError) {
    return noStore(jsonError(error.status, error.code, error.message));
  }

  logInternalError(context);

  return noStore(
    jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible procesar la solicitud"),
  );
}

function textField(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function loadMediaOwner(contexto, registroId) {
  if (contexto === "contenidos") return obtenerContenidoAdmin(registroId);
  if (contexto === "actividades") return getActividadAdmin(registroId);
  if (contexto === "museo") return getPiezaMuseoAdmin(registroId);
  return null;
}

function notFoundLabel(contexto) {
  if (contexto === "actividades") return "Actividad no encontrada.";
  if (contexto === "museo") return "Pieza no encontrada.";
  return "Contenido no encontrado.";
}

function assignedLabel(contexto) {
  if (contexto === "actividades") return "La imagen sigue asignada a la actividad.";
  if (contexto === "museo") return "La imagen sigue asignada a la pieza.";
  return "La imagen sigue asignada al contenido.";
}

export async function POST(request) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) return noStore(auth.response);

    const form = await request.formData();
    const target = mediaTarget(
      textField(form.get("contexto")),
      textField(form.get("tipoImagen")),
      textField(form.get("registroId")),
    );

    if (!target) {
      throw new MediaError(400, "INVALID_FILE", "La solicitud no es válida.");
    }

    const owner = await loadMediaOwner(target.contexto, target.registroId);

    if (!owner) {
      throw new MediaError(404, "NOT_FOUND", notFoundLabel(target.contexto));
    }

    const file = form.get("file");

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

    const path = buildObjectPath(target, inspected.extension);

    if (!path) {
      throw new MediaError(400, "INVALID_FILE", "La solicitud no es válida.");
    }

    const url = await uploadImage({
      path,
      bytes,
      contentType: inspected.mime,
    });

    return noStore(jsonSuccess({ url }, {}, 201));
  } catch (error) {
    return mediaFailure(error, "POST /api/admin/media");
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) return noStore(auth.response);

    const body = await request.json().catch(() => null);
    const owned = parseOwnedPortadaUrl(body?.url);

    if (!owned) {
      throw new MediaError(400, "INVALID_FILE", "La imagen no es válida.");
    }

    const owner = await loadMediaOwner(owned.contexto, owned.registroId);

    if (!owner) {
      throw new MediaError(404, "NOT_FOUND", notFoundLabel(owned.contexto));
    }

    const current = parseOwnedPortadaUrl(owner.imagen_url);

    if (current?.path === owned.path) {
      throw new MediaError(400, "INVALID_FILE", assignedLabel(owned.contexto));
    }

    await deleteImage(owned.path);

    return noStore(jsonSuccess({ eliminado: true }));
  } catch (error) {
    return mediaFailure(error, "DELETE /api/admin/media");
  }
}
