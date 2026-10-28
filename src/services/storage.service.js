import "server-only";

import { MediaError } from "@/lib/media/errors.mjs";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  parseOwnedPortadaUrl,
} from "@/lib/media/policy.mjs";
import { logInternalError } from "@/lib/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function storageFailed() {
  return new MediaError(500, "STORAGE", "No se pudo procesar la imagen.");
}

async function ensureBucket(contentType, size) {
  const storage = getSupabaseAdminClient().storage;
  const { data: current, error } = await storage.getBucket(MEDIA_BUCKET);
  // Provisioning is an operator task; an upload must never change privacy.
  if (error || !current?.public
    || size > MEDIA_MAX_BYTES
    || (current.file_size_limit != null && size > Number(current.file_size_limit))
    || (current.allowed_mime_types?.length && !current.allowed_mime_types.includes(contentType))) {
    throw storageFailed();
  }
}

export function getPublicUrl(path) {
  const { data } = getSupabaseAdminClient().storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return data?.publicUrl ?? null;
}

export async function uploadImage({ path, bytes, contentType }) {
  await ensureBucket(contentType, bytes.byteLength);

  const { error } = await getSupabaseAdminClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) throw storageFailed();

  const url = getPublicUrl(path);

  if (!url) throw storageFailed();

  return url;
}

export async function deleteImage(path) {
  const { error } = await getSupabaseAdminClient().storage.from(MEDIA_BUCKET).remove([path]);

  if (error) throw storageFailed();
}

export async function deleteOwnedPortada(url) {
  const owned = parseOwnedPortadaUrl(url);

  if (!owned) return false;

  try {
    await deleteImage(owned.path);
    return true;
  } catch {
    logInternalError("storage delete portada");
    return false;
  }
}
