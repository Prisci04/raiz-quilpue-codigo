import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { requireGestorContenido } from "@/lib/auth/guard";
import { MediaError } from "@/lib/media/errors.mjs";
import {
  buildAporteObjectPath,
  buildObjectPath,
  inspectImageFile,
  mediaTarget,
  parseOwnedAporteImageUrl,
  parseOwnedPortadaUrl,
} from "@/lib/media/policy.mjs";
import { noStore } from "@/lib/contenidos/respond";
import {
  findAporteByImagenUrl,
  getActividadAdmin,
  getPiezaMuseoAdmin,
} from "@/services/admin-community.service";
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
    const contexto = textField(form.get("contexto"));
    const tipoImagen = textField(form.get("tipoImagen"));
    const aporteUpload = contexto === "museo" && tipoImagen === "aporte";
    const target = aporteUpload
      ? { contexto: "museo", tipoImagen: "aporte", registroId: null, folder: "museo/aportes" }
      : mediaTarget(contexto, tipoImagen, textField(form.get("registroId")));

    if (!target) {
      throw new MediaError(400, "INVALID_FILE", "La solicitud no es válida.");
    }

    if (!aporteUpload) {
      const owner = await loadMediaOwner(target.contexto, target.registroId);

      if (!owner) {
        throw new MediaError(404, "NOT_FOUND", notFoundLabel(target.contexto));
      }
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

    const path = aporteUpload
      ? buildAporteObjectPath(inspected.extension)
      : buildObjectPath(target, inspected.extension);

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
    const ownedPortada = parseOwnedPortadaUrl(body?.url);
    const ownedAporte = parseOwnedAporteImageUrl(body?.url);

    if (!ownedPortada && !ownedAporte) {
      throw new MediaError(400, "INVALID_FILE", "La imagen no es válida.");
    }

    if (ownedAporte) {
      const assigned = await findAporteByImagenUrl(body.url);
      if (assigned) {
        throw new MediaError(400, "INVALID_FILE", assignedLabel("museo"));
      }

      await deleteImage(ownedAporte.path);
      return noStore(jsonSuccess({ eliminado: true }));
    }

    const owner = await loadMediaOwner(ownedPortada.contexto, ownedPortada.registroId);

    if (!owner) {
      throw new MediaError(404, "NOT_FOUND", notFoundLabel(ownedPortada.contexto));
    }

    const current = parseOwnedPortadaUrl(owner.imagen_url);

    if (current?.path === ownedPortada.path) {
      throw new MediaError(400, "INVALID_FILE", assignedLabel(ownedPortada.contexto));
    }

    await deleteImage(ownedPortada.path);

    return noStore(jsonSuccess({ eliminado: true }));
  } catch (error) {
    return mediaFailure(error, "DELETE /api/admin/media");
  }
}
