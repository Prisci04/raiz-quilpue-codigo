import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { parseAporteMuseoInput } from "@/lib/community-validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAporteMuseo } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

const BUCKET = "public-media";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

function safeExtension(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || !/^[a-z0-9]+$/.test(extension)) {
    return "";
  }

  return `.${extension}`;
}

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

    const supabase = getSupabaseAdminClient();

    const fileId = crypto.randomUUID();
    const extension = safeExtension(file);

    uploadedPath = `museo/aportes/${fileId}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadedPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`No fue posible subir el archivo: ${uploadError.message}`);
    }

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
    console.error("[POST /api/museo/aportes]", error);

    if (uploadedPath) {
      try {
        await getSupabaseAdminClient()
          .storage
          .from(BUCKET)
          .remove([uploadedPath]);
      } catch {
        // Evita ocultar el error original.
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