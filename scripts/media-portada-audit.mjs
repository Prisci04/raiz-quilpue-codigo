import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  MEDIA_TYPES,
  buildObjectPath,
  inspectImageFile,
  mediaTarget,
  parseOwnedPortadaUrl,
} from "../src/lib/media/policy.mjs";

const env = {};

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function check(name, ok, detail = "") {
  console.log(`${ok ? "OK " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const listed = await admin.storage.listBuckets();
let bucket = (listed.data ?? []).find((item) => item.name === MEDIA_BUCKET);

if (!bucket) {
  const created = await admin.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MEDIA_MAX_BYTES,
    allowedMimeTypes: Object.keys(MEDIA_TYPES),
  });
  check("bucket creado", !created.error, created.error?.message ?? MEDIA_BUCKET);
  bucket = { public: true };
} else {
  check("bucket existente", true, `${MEDIA_BUCKET} public=${bucket.public}`);
  if (!bucket.public) {
    const updated = await admin.storage.updateBucket(MEDIA_BUCKET, { public: true });
    check("bucket público", !updated.error);
  }
}

const inserted = await admin
  .from("contenidos")
  .insert({
    titulo: "PROBE portada storage",
    descripcion: "probe",
    resumen: "probe",
    tipo: "noticia",
    estado: "borrador",
    contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "probe" }] }] },
  })
  .select("id,imagen_url")
  .single();

check("contenido de prueba", !inserted.error, inserted.error?.message ?? `id=${inserted.data?.id}`);

const id = inserted.data?.id;
const target = mediaTarget("contenidos", "portada", String(id));
const inspected = inspectImageFile({
  bytes: png,
  type: "image/png",
  name: "foto final definitiva 2!!!.png",
  size: png.byteLength,
});
const path = buildObjectPath(target, inspected.extension);
check("ruta con uuid", /^contenidos\/\d+\/portada\/[0-9a-f-]{36}\.png$/.test(path), path);

const uploaded = await admin.storage.from(MEDIA_BUCKET).upload(path, png, {
  contentType: "image/png",
  upsert: false,
});
check("upload png", !uploaded.error, uploaded.error?.message ?? "");

const publicUrl = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
const owned = parseOwnedPortadaUrl(publicUrl);
check("url pública del proyecto", Boolean(owned) && owned.registroId === id);

const fetched = await fetch(publicUrl);
check("lectura pública", fetched.status === 200, String(fetched.status));

const saved = await admin.from("contenidos").update({ imagen_url: publicUrl }).eq("id", id).select("imagen_url").single();
check("imagen_url guardada", saved.data?.imagen_url === publicUrl);

const replacement = buildObjectPath(target, "png");
const replaced = await admin.storage.from(MEDIA_BUCKET).upload(replacement, png, { contentType: "image/png" });
const nextUrl = admin.storage.from(MEDIA_BUCKET).getPublicUrl(replacement).data.publicUrl;
const swapped = await admin.from("contenidos").update({ imagen_url: nextUrl }).eq("id", id).select("imagen_url").single();
check("reemplazo en bd", swapped.data?.imagen_url === nextUrl && !replaced.error);
await admin.storage.from(MEDIA_BUCKET).remove([path]);
const folder = await admin.storage.from(MEDIA_BUCKET).list(`contenidos/${id}/portada`);
const names = (folder.data ?? []).map((file) => file.name);
check("imagen antigua eliminada", !names.includes(path.split("/").pop()), names.join(",") || "vacía");

await admin.from("contenidos").update({ imagen_url: null }).eq("id", id);
await admin.storage.from(MEDIA_BUCKET).remove([replacement]);
const cleared = await admin.from("contenidos").select("imagen_url").eq("id", id).single();
check("imagen_url null", cleared.data?.imagen_url == null);

const anonWrite = await anon.storage.from(MEDIA_BUCKET).upload(
  `contenidos/${id}/portada/anon-no.png`,
  png,
  { contentType: "image/png" },
);
check("anon no puede subir", Boolean(anonWrite.error), anonWrite.error?.message ?? "subió");

await admin.from("contenidos").delete().eq("id", id);
const gone = await admin.from("contenidos").select("id").eq("id", id).maybeSingle();
check("contenido de prueba eliminado", !gone.data);

try {
  const unauth = await fetch("http://localhost:3000/api/admin/media", { method: "POST" });
  check("sin sesión", unauth.status === 401, String(unauth.status));
} catch {
  check("sin sesión", false, "el servidor de desarrollo no respondió");
}

console.log(process.exitCode ? "audit con fallos" : "audit ok");
