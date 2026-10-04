import "server-only";

import { MediaError } from "@/lib/media/errors.mjs";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  MEDIA_TYPES,
  parseOwnedPortadaUrl,
} from "@/lib/media/policy.mjs";
import { logInternalError } from "@/lib/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

let bucketReady = false;

function storageFailed() {
  return new MediaError(500, "STORAGE", "No se pudo procesar la imagen.");
}

async function ensureBucket() {
  if (bucketReady) return;

  const storage = getSupabaseAdminClient().storage;
  const listed = await storage.listBuckets();

  if (listed.error) throw storageFailed();

  const current = (listed.data ?? []).find((bucket) => bucket.name === MEDIA_BUCKET);

  if (!current) {
    const created = await storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: MEDIA_MAX_BYTES,
      allowedMimeTypes: Object.keys(MEDIA_TYPES),
    });

    if (created.error) throw storageFailed();
  } else if (!current.public) {
    const updated = await storage.updateBucket(MEDIA_BUCKET, { public: true });

    if (updated.error) throw storageFailed();
  }

  bucketReady = true;
}

export function getPublicUrl(path) {
  const { data } = getSupabaseAdminClient().storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return data?.publicUrl ?? null;
}

export async function uploadImage({ path, bytes, contentType }) {
  await ensureBucket();

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
