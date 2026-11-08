import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = process.env.AUDIT_BASE ?? "http://localhost:3000";

function loadEnv(path) {
  const env = {};
  let text = "";

  try {
    text = readFileSync(path, "utf8");
  } catch {
    return env;
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match) {
      env[match[1]] = match[2].trim();
    }
  }

  return env;
}

function walk(dir, files = []) {
  let entries = [];

  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = join(dir, entry);
    const info = statSync(path);

    if (info.isDirectory()) {
      walk(path, files);
    } else if (entry.endsWith(".js")) {
      files.push(path);
    }
  }

  return files;
}

function assertSafeBody(label, body) {
  const forbidden = ["password_hash", "token_hash", "SUPABASE_SECRET_KEY", "service_role"];

  for (const word of forbidden) {
    if (body.includes(word)) {
      throw new Error(`${label} expone ${word}`);
    }
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);

  if (!headers.has("origin") && options.origin !== false) {
    headers.set("origin", base);
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
    redirect: "manual",
  });
  const body = await response.text();
  assertSafeBody(`${options.method ?? "GET"} ${path}`, body);
  return { status: response.status, body, headers: response.headers };
}

const env = loadEnv(".env.local");
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name} — ${detail}`);
}

const empty = await request("/api/auth/login", { method: "POST", body: "" });
record("body vacío", empty.status === 400, String(empty.status));

const invalidJson = await request("/api/auth/login", { method: "POST", body: "{" });
record("JSON inválido", invalidJson.status === 400, String(invalidJson.status));

const missing = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "a@b.cl" }),
});
record("campo faltante", missing.status === 400, String(missing.status));

const longPassword = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "a@b.cl", password: "x".repeat(129) }),
});
record("password larga", longPassword.status === 400, String(longPassword.status));

const injection = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "' OR 1=1 --", password: "x" }),
});
record("sql injection", injection.status === 400, String(injection.status));

const xss = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "<script>alert(1)</script>@x.cl",
    password: "x",
  }),
});
record("xss en email", xss.status === 400 && !xss.body.includes("<script>"), String(xss.status));

const foreign = await request("/api/auth/login", {
  method: "POST",
  origin: false,
  headers: {
    origin: "https://evil.example",
    "content-type": "application/json",
  },
  body: JSON.stringify({ email: "a@b.cl", password: "x" }),
});
record("origen cruzado", foreign.status === 403, String(foreign.status));

const unknown = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "No.Existe@raizquilpue.cl", password: "incorrecta" }),
});
record(
  "email inexistente o mayúsculas",
  unknown.status === 401 || unknown.status === 500,
  `${unknown.status} ${unknown.body.slice(0, 180)}`,
);

const adminApi = await request("/api/admin", { method: "GET", origin: false });
record("api admin sin sesión", adminApi.status === 401, String(adminApi.status));

const me = await request("/api/auth/me", { method: "GET", origin: false });
record("me sin sesión", me.status === 401, String(me.status));

const tampered = await request("/api/auth/me", {
  method: "GET",
  origin: false,
  headers: { cookie: "rq_session=manipulado" },
});
record("cookie manipulada", tampered.status === 401, String(tampered.status));

const shaped = "aaaa.bbbb";
const unknownToken = await request("/api/auth/me", {
  method: "GET",
  origin: false,
  headers: { cookie: `rq_session=${shaped}` },
});
record(
  "token inexistente",
  unknownToken.status === 401 || unknownToken.status === 500,
  String(unknownToken.status),
);

const logout = await request("/api/auth/logout", { method: "POST" });
record("logout sin sesión", logout.status === 200, String(logout.status));
record(
  "logout limpia cookie",
  (logout.headers.get("set-cookie") ?? "").includes("rq_session="),
  logout.headers.get("set-cookie") ? "set-cookie presente" : "sin set-cookie",
);

const adminPage = await request("/admin", { method: "GET", origin: false });
const location = adminPage.headers.get("location") ?? "";
record(
  "admin sin sesión",
  (adminPage.status === 307 || adminPage.status === 302) && location.endsWith("/admin/login"),
  `${adminPage.status} ${location}`,
);

const loginPage = await request("/admin/login", { method: "GET", origin: false });
record(
  "pantalla login",
  loginPage.status === 200 &&
    loginPage.body.includes("Iniciar sesión") &&
    !loginPage.body.includes("raiz2026"),
  String(loginPage.status),
);

const staticFiles = walk(".next/static");
const secret = env.SUPABASE_SECRET_KEY ?? "";
let nameLeak = false;
let valueLeak = false;

for (const file of staticFiles) {
  const text = readFileSync(file, "utf8");

  if (text.includes("SUPABASE_SECRET_KEY")) {
    nameLeak = true;
  }

  if (secret && text.includes(secret)) {
    valueLeak = true;
  }
}

record("bundle cliente sin nombre de secreto", !nameLeak, nameLeak ? "aparece" : "no aparece");
record(
  "bundle cliente sin valor de secreto",
  !valueLeak,
  secret ? (valueLeak ? "aparece" : "no aparece") : "variable ausente",
);

const failed = results.filter((item) => !item.ok);

if (failed.length > 0) {
  process.exitCode = 1;
}
