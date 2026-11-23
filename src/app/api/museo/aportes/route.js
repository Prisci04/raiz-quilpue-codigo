import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { parseAporteMuseoInput } from "@/lib/community-validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAporteMuseo } from "@/services/admin-community.service";
import { listCatalogo } from "@/services/catalogos.service";
import { MEDIA_BUCKET, MEDIA_MAX_BYTES, inspectImageFile } from "@/lib/media/policy.mjs";

export const dynamic = "force-dynamic";

const BUCKET = MEDIA_BUCKET;
const MAX_FILE_SIZE = MEDIA_MAX_BYTES;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request) {
  let uploadedPath = null;

  try {
    const formData = await request.formData();
    const file = formData.get("archivo");
    const hasFile = file instanceof File && file.size > 0;

    let publicUrl = null;

    if (hasFile) {
      if (file.size > MAX_FILE_SIZE) {
        return noStore(
          jsonError(
            400,
            "FILE_TOO_LARGE",
            "La imagen no puede superar los 5 MB.",
          ),
        );
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return noStore(
          jsonError(
            400,
            "INVALID_FILE_TYPE",
            "Solo se permiten imágenes JPG, PNG, WEBP o AVIF.",
          ),
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const inspected = inspectImageFile({
        bytes: buffer,
        type: file.type,
        name: file.name,
        size: file.size,
      });
      if (!inspected.ok) {
        return noStore(jsonError(inspected.status, inspected.code, inspected.message));
      }

      const supabase = getSupabaseAdminClient();
      const fileId = crypto.randomUUID();
      const candidatePath = `museo/aportes/${fileId}.${inspected.extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(candidatePath, buffer, {
          contentType: inspected.mime,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`No fue posible subir el archivo: ${uploadError.message}`);
      }

      uploadedPath = candidatePath;

      const {
        data: { publicUrl: uploadedUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath);
      publicUrl = uploadedUrl;
    }

    const catalogos = {
      categoria_museo: await listCatalogo("categoria_museo"),
    };
    const parsed = parseAporteMuseoInput(
      {
        nombre: formData.get("nombre"),
        apellido: formData.get("apellido"),
        correo: formData.get("correo"),
        id_categoria_museo: formData.get("id_categoria_museo"),
        titulo: formData.get("titulo"),
        descripcion: formData.get("descripcion"),
        fecha_aproximada: formData.get("fecha_aproximada"),
        lugar: formData.get("lugar"),
        imagen_url: publicUrl,
      },
      catalogos,
    );

    if (!parsed.ok) {
      throw Object.assign(new Error(parsed.message), { validation: true });
    }

    await createAporteMuseo(parsed.value);

    return noStore(
      jsonSuccess(
        {
          recibido: true,
          imagen_url: publicUrl,
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

    if (error?.validation) {
      return noStore(jsonError(400, "VALIDATION", error.message));
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
