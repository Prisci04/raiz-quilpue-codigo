import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { passwordMeetsPolicy } from "../src/lib/usuarios/validation.mjs";

// Manual recovery only. Credentials must be supplied for each invocation.
const email = process.env.RESET_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.RESET_ADMIN_PASSWORD;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordMeetsPolicy(password)) {
  throw new Error("Provide RESET_ADMIN_EMAIL and RESET_ADMIN_PASSWORD matching the application password policy.");
}

// Read existing local configuration without writing it; injected environment wins.
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error("Missing required server configuration");

const client = createClient(url, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const passwordHash = await bcrypt.hash(password, 12);
const { data, error } = await client
  .from("usuarios")
  .update({ password_hash: passwordHash })
  .eq("email", email)
  .eq("tipo_usuario", "interno")
  .eq("estado", "activo")
  .select("id");

if (error) throw new Error("Password recovery failed");
console.log("Updated accounts:", (data ?? []).length);
