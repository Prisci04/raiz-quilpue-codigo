// Metadata only: GET requests. Never execute SQL or read application rows.
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const tables = ["usuarios", "roles", "usuario_roles", "sesiones", "actividades", "actividad_inscripciones", "contenidos", "museo_piezas", "museo_aportes"];

async function metadata(path, accept = "application/json", credential = key) {
  try {
    const response = await fetch(new URL(path, base), {
      method: "GET",
      headers: {
        apikey: credential, Accept: accept,
        ...(/^sb_(publishable|secret)_/.test(credential) ? {} : { Authorization: "Bearer " + credential }),
      },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) return { status: response.status };
    return { status: response.status, body: await response.json() };
  } catch {
    return { status: "UNREACHABLE" };
  }
}

if (!base || !key) {
  console.log(JSON.stringify({ verified: false, reason: "MISSING_CONFIGURATION" }));
} else {
  const schema = await metadata("/rest/v1/", "application/openapi+json");
  const storage = await metadata("/storage/v1/bucket");
  const publicSchema = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? await metadata("/rest/v1/", "application/openapi+json", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    : { status: "MISSING_PUBLIC_KEY" };
  const publicAccess = {};
  if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    for (const name of tables) {
      // LIMIT 0 checks the endpoint permission without retrieving any rows.
      const column = name === "usuario_roles" ? "usuario_id" : "id";
      const result = await metadata("/rest/v1/" + name + "?select=" + column + "&limit=0", "application/json", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      publicAccess[name] = result.status;
    }
  }
  const definitions = schema.body?.definitions ?? {};
  console.log(JSON.stringify({
    inspection: "GET metadata only",
    schemaStatus: schema.status,
    columns: Object.fromEntries(tables.map((name) => [name, Object.keys(definitions[name]?.properties ?? {})])),
    columnTypes: Object.fromEntries(tables.map((name) => [name, Object.fromEntries(
      Object.entries(definitions[name]?.properties ?? {}).map(([column, info]) => [column, {
        type: info.format ?? info.type, maxLength: info.maxLength, enum: info.enum,
      }]),
    )])),
    rpcNames: Object.keys(schema.body?.paths ?? {}).filter((path) => path.startsWith("/rpc/")),
    storageStatus: storage.status,
    buckets: Array.isArray(storage.body) ? storage.body.map((bucket) => ({
      name: bucket.name, public: bucket.public,
      fileSizeLimit: bucket.file_size_limit, allowedMimeTypes: bucket.allowed_mime_types,
    })) : [],
    publicSchemaStatus: publicSchema.status,
    publicPaths: Object.keys(publicSchema.body?.paths ?? {}),
    publicAccessLimitZero: publicAccess,
    notVerified: ["indexes", "effective RLS policies", "all constraints", "transaction concurrency"],
  }, null, 2));
}
