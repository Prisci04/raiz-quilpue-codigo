import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { parseAporteMuseoInput } from "@/lib/community-validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAporteMuseo } from "@/services/admin-community.service";
import { MEDIA_BUCKET, MEDIA_MAX_BYTES } from "@/lib/media/policy.mjs";
import { inspectMuseoFile, MUSEO_FILE_TYPES } from "@/lib/media/museo-policy.mjs";

export const dynamic = "force-dynamic";

const BUCKET = MEDIA_BUCKET;
const MAX_FILE_SIZE = MEDIA_MAX_BYTES;
const ALLOWED_TYPES = new Set(Object.keys(MUSEO_FILE_TYPES));

export async function POST(request) {
  let uploadedPath = null;

  try {
    const formData = await request.formData();
    const file = formData.get("archivo");

    if (!(file instanceof File) || file.size === 0) {
      return noStore(
        jsonError(400, "VALIDATION", "Debes seleccionar un archivo."),
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return noStore(
        jsonError(
          400,
          "FILE_TOO_LARGE",
          "El archivo no puede superar los 5 MB.",
        ),
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return noStore(
        jsonError(
          400,
          "INVALID_FILE_TYPE",
          "Solo se permiten imágenes JPG, PNG, WEBP, AVIF o archivos PDF.",
        ),
      );
    }

    const input = parseAporteMuseoInput({
      nombre: formData.get("nombre"),
      correo: formData.get("correo"),
      categoria: formData.get("categoria"),
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion"),
      fecha_aproximada: formData.get("fecha_aproximada"),
      lugar: formData.get("lugar"),
      archivo_nombre: file.name,
      informacion_adicional: formData.get("informacion_adicional"),
    });

    if (!input) {
      return noStore(
        jsonError(
          400,
          "VALIDATION",
          "Revisa los campos obligatorios del aporte.",
        ),
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const inspected = inspectMuseoFile({ bytes: buffer, type: file.type, name: file.name, size: file.size });
    if (!inspected.ok) {
      return noStore(jsonError(400, inspected.code, inspected.message));
    }

    const supabase = getSupabaseAdminClient();
    const fileId = crypto.randomUUID();
    const candidatePath = `museo/aportes/${fileId}.${inspected.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(candidatePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`No fue posible subir el archivo: ${uploadError.message}`);
    }

    uploadedPath = candidatePath;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath);

    await createAporteMuseo({
      ...input,
      archivo_url: publicUrl,
    });

    return noStore(
      jsonSuccess(
        {
          recibido: true,
          archivo_url: publicUrl,
        },
        {},
        201,
      ),
    );
  } catch (error) {
    if (uploadedPath) {
      try {
        const cleanup = await getSupabaseAdminClient()
          .storage
          .from(BUCKET)
          .remove([uploadedPath]);
        if (cleanup.error) logInternalError("museo aporte upload cleanup pending");
      } catch {
        logInternalError("museo aporte upload cleanup pending");
      }
    }

    logInternalError("POST /api/museo/aportes");

    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible recibir el aporte.",
      ),
    );
  }
}
