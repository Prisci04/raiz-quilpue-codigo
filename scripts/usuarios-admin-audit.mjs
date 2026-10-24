import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { generatePassword } from "../src/lib/usuarios/generate-password.mjs";

const base = process.env.AUDIT_BASE ?? "http://localhost:3000";
const adminEmail = process.env.AUDIT_ADMIN_EMAIL;
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD;

function loadEnv(path) {
  const env = {};
  const text = readFileSync(path, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match) {
      env[match[1]] = match[2].trim();
    }
  }

  return env;
}

const env = loadEnv(".env.local");
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const results = [];
const createdIds = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieFrom(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function request(path, { method = "GET", cookie, body, origin = true } = {}) {
  const headers = new Headers();

  if (origin) {
    headers.set("origin", base);
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, json, text, cookie: cookieFrom(response) };
}

async function login(email, password) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

  return response;
}

async function inspectUsuario(id) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("tipo_usuario,estado,password_hash")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.code ?? "inspect");
  }

  return data;
}

async function countSesiones(usuarioId) {
  const { count, error } = await supabase
    .from("sesiones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId);

  if (error) {
    throw new Error(error.code ?? "sesiones");
  }

  return count ?? 0;
}

function exposesSecret(text, password) {
  return (
    text.includes("password_hash") ||
    text.includes(password) ||
    text.includes("SUPABASE_SECRET_KEY")
  );
}

async function cleanup(adminCookie) {
  for (const id of createdIds) {
    await request(`/api/admin/usuarios/${id}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "inactivo" },
    });
    await request(`/api/admin/usuarios/${id}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
  }
}

async function main() {
  if (!adminEmail || !adminPassword) {
    throw new Error("Faltan AUDIT_ADMIN_EMAIL y AUDIT_ADMIN_PASSWORD");
  }

  const adminLogin = await login(adminEmail, adminPassword);
  record("login administrador", adminLogin.status === 200, String(adminLogin.status));
  const adminCookie = adminLogin.cookie;

  const anon = await request("/api/admin/usuarios");
  record("sin sesión recibe 401", anon.status === 401, String(anon.status));

  const list = await request("/api/admin/usuarios", { cookie: adminCookie });
  const listText = list.text;
  const seed = list.json?.data?.usuarios?.find(
    (usuario) => usuario.email === adminEmail.toLowerCase(),
  );
  record(
    "administrador lista usuarios internos",
    list.status === 200 && Array.isArray(list.json?.data?.usuarios) && Boolean(seed),
    String(list.status),
  );
  record(
    "listado no incluye password_hash",
    list.status === 200 && !listText.includes("password_hash"),
  );

  const selfOff = await request(`/api/admin/usuarios/${seed.id}/estado`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { estado: "inactivo" },
  });
  record(
    "administrador no puede desactivarse",
    selfOff.status === 403,
    `${selfOff.status} ${selfOff.json?.error?.code ?? ""}`,
  );

  const selfDelete = await request(`/api/admin/usuarios/${seed.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  record(
    "administrador no puede eliminarse",
    selfDelete.status === 403,
    `${selfDelete.status} ${selfDelete.json?.error?.code ?? ""}`,
  );

  const lastAdmin = await request(`/api/admin/usuarios/${seed.id}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      nombre: seed.nombre,
      apellido: seed.apellido,
      email: seed.email,
      telefono: seed.telefono,
      rolCodigo: "editor",
    },
  });
  record(
    "no se puede quitar al último administrador",
    lastAdmin.status === 409 && lastAdmin.json?.error?.code === "LAST_ADMIN",
    `${lastAdmin.status} ${lastAdmin.json?.error?.code ?? ""}`,
  );

  const editorPassword = generatePassword();
  const editorEmail = `audit.editor.${Date.now()}@raizquilpue.cl`;
  const createdEditor = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: adminCookie,
    body: {
      nombre: "María",
      apellido: "González",
      email: `  ${editorEmail.toUpperCase()}  `,
      telefono: "+56911112222",
      password: editorPassword,
      rolCodigo: "editor",
      tipo_usuario: "publico",
      estado: "inactivo",
      password_hash: "plano",
      rol_id: 1,
    },
  });
  const editor = createdEditor.json?.data;
  if (editor?.id) createdIds.push(editor.id);
  record(
    "crear editor",
    createdEditor.status === 201 && editor?.roles?.[0]?.codigo === "editor",
    `${createdEditor.status} ${createdEditor.json?.error?.code ?? ""}`,
  );
  record(
    "respuesta de creación no expone secreto",
    createdEditor.text &&
      !exposesSecret(createdEditor.text, editorPassword) &&
      !createdEditor.text.includes("plano"),
  );

  if (editor?.id) {
    const row = await inspectUsuario(editor.id);
    record("tipo_usuario interno y estado activo", row?.tipo_usuario === "interno" && row?.estado === "activo");
    record(
      "contraseña guardada como hash",
      Boolean(row?.password_hash?.startsWith("$2")) && row.password_hash !== editorPassword,
    );
  }

  const duplicate = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: adminCookie,
    body: {
      nombre: "Otra",
      email: editorEmail,
      password: editorPassword,
      rolCodigo: "editor",
    },
  });
  record(
    "correo duplicado rechazado",
    duplicate.status === 409 && duplicate.json?.error?.code === "EMAIL_TAKEN",
    `${duplicate.status} ${duplicate.json?.error?.code ?? ""}`,
  );

  const weak = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: adminCookie,
    body: {
      nombre: "Débil",
      email: `debil.${Date.now()}@raizquilpue.cl`,
      password: "12345678",
      rolCodigo: "editor",
    },
  });
  record("contraseña débil rechazada", weak.status === 400, String(weak.status));

  const generatedPassword = generatePassword();
  const generatedEmail = `audit.admin.${Date.now()}@raizquilpue.cl`;
  const createdAdmin = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: adminCookie,
    body: {
      nombre: "Andrea",
      apellido: "Soto",
      email: generatedEmail,
      password: generatedPassword,
      rolCodigo: "administrador",
    },
  });
  const secondAdmin = createdAdmin.json?.data;
  if (secondAdmin?.id) createdIds.push(secondAdmin.id);
  record(
    "crear administrador con contraseña generada",
    createdAdmin.status === 201 && secondAdmin?.roles?.[0]?.codigo === "administrador",
    `${createdAdmin.status} ${createdAdmin.json?.error?.code ?? ""}`,
  );

  const editorLogin = await login(editorEmail, editorPassword);
  record("editor puede iniciar sesión", editorLogin.status === 200, String(editorLogin.status));
  const editorCookie = editorLogin.cookie;

  const editorList = await request("/api/admin/usuarios", { cookie: editorCookie });
  const editorPost = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: editorCookie,
    body: {
      nombre: "Intruso",
      email: `intruso.${Date.now()}@raizquilpue.cl`,
      password: editorPassword,
      rolCodigo: "editor",
    },
  });
  const editorPatch = editor?.id
    ? await request(`/api/admin/usuarios/${editor.id}`, {
        method: "PATCH",
        cookie: editorCookie,
        body: {
          nombre: "María",
          apellido: "González",
          email: editorEmail,
          rolCodigo: "administrador",
        },
      })
    : { status: 0 };
  record("editor recibe 403 al listar", editorList.status === 403, String(editorList.status));
  record("editor recibe 403 al crear", editorPost.status === 403, String(editorPost.status));
  record("editor recibe 403 al editar", editorPatch.status === 403, String(editorPatch.status));

  if (editor?.id) {
    const sessionsBefore = await countSesiones(editor.id);
    record("editor tiene sesión activa", sessionsBefore >= 1, String(sessionsBefore));

    const deactivated = await request(`/api/admin/usuarios/${editor.id}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "inactivo" },
    });
    const sessionsAfter = await countSesiones(editor.id);
    const me = await request("/api/auth/me", { cookie: editorCookie, origin: false });
    const blockedLogin = await login(editorEmail, editorPassword);
    record(
      "desactivar usuario",
      deactivated.status === 200 && deactivated.json?.data?.estado === "inactivo",
      `${deactivated.status} ${deactivated.json?.error?.code ?? ""}`,
    );
    record("desactivar elimina sesiones", sessionsAfter === 0, String(sessionsAfter));
    record("sesión previa queda inválida", me.status === 401, String(me.status));
    record(
      "inactivo no inicia sesión y el mensaje es genérico",
      blockedLogin.status === 401 &&
        !blockedLogin.text.toLowerCase().includes("desactiv"),
      String(blockedLogin.status),
    );

    const renamed = await request(`/api/admin/usuarios/${editor.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: {
        nombre: "María Elena",
        apellido: "González Ruiz",
        email: editorEmail,
        telefono: null,
        rolCodigo: "administrador",
      },
    });
    record(
      "editar nombre y cambiar rol",
      renamed.status === 200 &&
        renamed.json?.data?.nombre === "María Elena" &&
        renamed.json?.data?.roles?.[0]?.codigo === "administrador",
      `${renamed.status} ${renamed.json?.error?.code ?? ""}`,
    );

    const backToEditor = await request(`/api/admin/usuarios/${editor.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: {
        nombre: "María Elena",
        apellido: "González Ruiz",
        email: editorEmail,
        rolCodigo: "editor",
      },
    });
    record(
      "rol vuelve a editor sin duplicar",
      backToEditor.status === 200 &&
        backToEditor.json?.data?.roles?.length === 1 &&
        backToEditor.json?.data?.roles?.[0]?.codigo === "editor",
      `${backToEditor.status}`,
    );

    if (secondAdmin?.id) {
      const deleteActive = await request(`/api/admin/usuarios/${secondAdmin.id}`, {
        method: "DELETE",
        cookie: adminCookie,
      });
      record(
        "usuario activo no se elimina",
        deleteActive.status === 409 &&
          deleteActive.json?.error?.message ===
            "Debes desactivar el usuario antes de eliminarlo.",
        `${deleteActive.status} ${deleteActive.json?.error?.code ?? ""}`,
      );
    }

    const reactivated = await request(`/api/admin/usuarios/${editor.id}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "activo" },
    });
    const loginAgain = await login(editorEmail, editorPassword);
    record(
      "reactivar no crea sesión y permite entrar después",
      reactivated.status === 200 &&
        reactivated.json?.data?.estado === "activo" &&
        loginAgain.status === 200,
      `${reactivated.status}/${loginAgain.status}`,
    );

    await request(`/api/admin/usuarios/${editor.id}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "inactivo" },
    });
    const removed = await request(`/api/admin/usuarios/${editor.id}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    record("usuario inactivo se elimina", removed.status === 200, String(removed.status));
    if (removed.status === 200) {
      const index = createdIds.indexOf(editor.id);
      if (index >= 0) createdIds.splice(index, 1);
    }
  }

  if (secondAdmin?.id) {
    await request(`/api/admin/usuarios/${secondAdmin.id}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "inactivo" },
    });
    const removedAdmin = await request(`/api/admin/usuarios/${secondAdmin.id}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    record(
      "administrador extra inactivo se elimina",
      removedAdmin.status === 200,
      String(removedAdmin.status),
    );
    if (removedAdmin.status === 200) {
      const index = createdIds.indexOf(secondAdmin.id);
      if (index >= 0) createdIds.splice(index, 1);
    }
  }

  const stillThere = await request("/api/admin/usuarios", { cookie: adminCookie });
  const seedStill = stillThere.json?.data?.usuarios?.find(
    (usuario) => usuario.email === adminEmail.toLowerCase(),
  );
  record(
    "el administrador original sigue activo",
    seedStill?.estado === "activo" &&
      seedStill?.roles?.some((rol) => rol.codigo === "administrador"),
  );

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pruebas ok`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error("AUDIT_ERROR", error?.message ?? "error");
  process.exitCode = 1;
} finally {
  const adminLogin = await login(adminEmail, adminPassword).catch(() => null);

  if (adminLogin?.cookie) {
    await cleanup(adminLogin.cookie);
  }
}
