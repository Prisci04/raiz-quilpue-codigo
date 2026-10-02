import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const env = {};

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);

  if (match) {
    env[match[1]] = match[2].trim();
  }
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const passwordHash = await bcrypt.hash("raiz2026", 10);
const { data, error } = await client
  .from("usuarios")
  .update({ password_hash: passwordHash })
  .eq("email", "admin@gmail.com")
  .eq("tipo_usuario", "interno")
  .eq("estado", "activo")
  .select("id,email,tipo_usuario,estado");

if (error) {
  console.log("update_error", error.code, error.message);
  process.exit(1);
}

console.log("updated", (data ?? []).length);

const login = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: {
    origin: "http://localhost:3000",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    email: "Admin@Gmail.com",
    password: "raiz2026",
  }),
});

const body = await login.json();
const setCookie = login.headers.get("set-cookie") ?? "";
const cookie = setCookie.split(";")[0];
const safeBody = JSON.stringify(body).includes("password_hash")
  ? "leaked"
  : "clean";

console.log("login", login.status, body.success, body.data?.email, safeBody);
console.log("cookie_http_only", /httponly/i.test(setCookie));

const me = await fetch("http://localhost:3000/api/auth/me", {
  headers: { cookie },
});
const meBody = await me.json();
console.log("me", me.status, meBody.data?.email, meBody.data?.tipoUsuario);

const admin = await fetch("http://localhost:3000/admin", {
  headers: { cookie },
  redirect: "manual",
});
console.log("admin", admin.status, admin.headers.get("location") ?? "panel");

const logout = await fetch("http://localhost:3000/api/auth/logout", {
  method: "POST",
  headers: { origin: "http://localhost:3000", cookie },
});
console.log("logout", logout.status);

const reused = await fetch("http://localhost:3000/api/auth/me", {
  headers: { cookie },
});
console.log("reuse_after_logout", reused.status);
