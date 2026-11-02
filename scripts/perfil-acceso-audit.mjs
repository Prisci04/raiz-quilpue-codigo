import { generatePassword } from "../src/lib/usuarios/generate-password.mjs";

const base = process.env.AUDIT_BASE ?? "http://localhost:3000";
const adminEmail = process.env.AUDIT_ADMIN_EMAIL;
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD;

const results = [];
const createdIds = [];

function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieFrom(response) {
  return (response.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function request(path, { method = "GET", cookie, body } = {}) {
  const headers = new Headers({ origin: base });

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

  return {
    status: response.status,
    json,
    text,
    cookie: cookieFrom(response),
    location: response.headers.get("location"),
  };
}

async function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
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
    throw new Error("Faltan credenciales de auditoría");
  }

  const adminLogin = await login(adminEmail, adminPassword);
  const adminCookie = adminLogin.cookie;
  record("login administrador", adminLogin.status === 200, String(adminLogin.status));

  const adminHome = await request("/admin", { cookie: adminCookie });
  record(
    "administrador ve Usuarios en Configuración",
    adminHome.status === 200 &&
      adminHome.text.includes('href="/admin/configuracion"') &&
      adminHome.text.includes("Usuarios") &&
      adminHome.text.includes("Configuración"),
    String(adminHome.status),
  );
  record(
    "administrador no ve Estadísticas en el menú",
    adminHome.status === 200 && !adminHome.text.includes('href="/admin/estadisticas"'),
    String(adminHome.status),
  );

  const adminConfig = await request("/admin/configuracion", { cookie: adminCookie });
  record(
    "administrador entra a configuración",
    adminConfig.status === 200,
    String(adminConfig.status),
  );

  const adminStats = await request("/admin/estadisticas", { cookie: adminCookie });
  record(
    "administrador entra a estadísticas",
    adminStats.status === 200,
    String(adminStats.status),
  );

  const anonPerfil = await request("/api/admin/perfil");
  record("sin sesión no entra al perfil", anonPerfil.status === 401, String(anonPerfil.status));

  const adminPerfil = await request("/api/admin/perfil", { cookie: adminCookie });
  record(
    "perfil del administrador sin secreto",
    adminPerfil.status === 200 &&
      adminPerfil.json?.data?.email === adminEmail.toLowerCase() &&
      !adminPerfil.text.includes("password_hash") &&
      !adminPerfil.text.includes("token_hash"),
    String(adminPerfil.status),
  );

  const selfOff = await request(`/api/admin/usuarios/${adminPerfil.json.data.id}/estado`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { estado: "inactivo" },
  });
  const selfDelete = await request(`/api/admin/usuarios/${adminPerfil.json.data.id}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  record("administrador no se desactiva", selfOff.status === 403, String(selfOff.status));
  record("administrador no se elimina", selfDelete.status === 403, String(selfDelete.status));

  const listed = await request("/api/admin/usuarios", { cookie: adminCookie });
  const activeAdmins = (listed.json?.data?.usuarios ?? []).filter(
    (usuario) =>
      usuario.estado === "activo" &&
      usuario.roles?.some((rol) => rol.codigo === "administrador"),
  );

  if (activeAdmins.length === 1) {
    const lastAdmin = await request(`/api/admin/usuarios/${adminPerfil.json.data.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: {
        nombre: adminPerfil.json.data.nombre,
        apellido: adminPerfil.json.data.apellido,
        email: adminPerfil.json.data.email,
        rolCodigo: "editor",
      },
    });
    record(
      "último administrador no pasa a editor",
      lastAdmin.status === 409,
      `${lastAdmin.status} ${lastAdmin.json?.error?.code ?? ""}`,
    );
  } else {
    record(
      "último administrador no se modifica si hay otros",
      true,
      `hay ${activeAdmins.length} administradores activos; el cambio no se intentó`,
    );
  }

  const editorPassword = generatePassword();
  const editorNext = generatePassword();
  const editorEmail = `perfil.editor.${Date.now()}@raizquilpue.cl`;
  const created = await request("/api/admin/usuarios", {
    method: "POST",
    cookie: adminCookie,
    body: {
      nombre: "Elena",
      apellido: "Soto",
      email: editorEmail,
      telefono: "+56911112222",
      password: editorPassword,
      rolCodigo: "editor",
    },
  });
  const editorId = created.json?.data?.id;
  if (editorId) createdIds.push(editorId);
  record("crear editor", created.status === 201, String(created.status));

  const editorLogin = await login(editorEmail, editorPassword);
  const editorCookie = editorLogin.cookie;
  const editorOther = await login(editorEmail, editorPassword);
  const otherCookie = editorOther.cookie;
  record("editor inicia sesión", editorLogin.status === 200 && editorOther.status === 200);

  const editorHome = await request("/admin", { cookie: editorCookie });
  record(
    "editor no ve Configuración",
    editorHome.status === 200 && !editorHome.text.includes('href="/admin/configuracion"'),
    String(editorHome.status),
  );
  record(
    "editor no ve Estadísticas",
    editorHome.status === 200 && !editorHome.text.includes('href="/admin/estadisticas"'),
    String(editorHome.status),
  );

  const editorConfig = await request("/admin/configuracion", { cookie: editorCookie });
  record(
    "editor no entra a configuración",
    [302, 303, 307, 308].includes(editorConfig.status) &&
      (editorConfig.location ?? "").includes("/admin"),
    `${editorConfig.status} ${editorConfig.location ?? ""}`,
  );

  const editorStats = await request("/admin/estadisticas", { cookie: editorCookie });
  record(
    "editor no entra a estadísticas",
    [302, 303, 307, 308].includes(editorStats.status) &&
      (editorStats.location ?? "").endsWith("/admin"),
    `${editorStats.status} ${editorStats.location ?? ""}`,
  );

  const editorUsers = await request("/api/admin/usuarios", { cookie: editorCookie });
  const editorRoleChange = await request(`/api/admin/usuarios/${adminPerfil.json.data.id}`, {
    method: "PATCH",
    cookie: editorCookie,
    body: {
      nombre: "Intruso",
      email: adminEmail,
      rolCodigo: "editor",
    },
  });
  record("editor recibe 403 en usuarios", editorUsers.status === 403, String(editorUsers.status));
  record("editor no cambia roles", editorRoleChange.status === 403, String(editorRoleChange.status));

  const editorPerfil = await request("/api/admin/perfil", { cookie: editorCookie });
  record(
    "editor abre su perfil",
    editorPerfil.status === 200 &&
      editorPerfil.json?.data?.rol?.codigo === "editor" &&
      !editorPerfil.text.includes("password_hash"),
    String(editorPerfil.status),
  );

  const updated = await request("/api/admin/perfil", {
    method: "PATCH",
    cookie: editorCookie,
    body: {
      nombre: "Elena María",
      apellido: "Soto Díaz",
      telefono: "+56933334444",
      email: "otro@raizquilpue.cl",
      rol: "administrador",
      estado: "inactivo",
      password_hash: "no",
    },
  });
  const data = updated.json?.data;
  record(
    "perfil actualiza solo datos permitidos",
    updated.status === 200 &&
      data?.nombre === "Elena María" &&
      data?.apellido === "Soto Díaz" &&
      data?.telefono === "+56933334444" &&
      data?.email === editorEmail &&
      data?.rol?.codigo === "editor" &&
      data?.estado === "activo",
    `${updated.status} ${updated.json?.error?.code ?? ""}`,
  );

  const wrongPassword = await request("/api/admin/perfil/password", {
    method: "PATCH",
    cookie: editorCookie,
    body: {
      passwordActual: "incorrecta",
      passwordNueva: editorNext,
      passwordConfirmacion: editorNext,
    },
  });
  record(
    "contraseña actual incorrecta",
    wrongPassword.status === 400 &&
      wrongPassword.json?.error?.message === "La contraseña actual es incorrecta.",
    String(wrongPassword.status),
  );

  const mismatch = await request("/api/admin/perfil/password", {
    method: "PATCH",
    cookie: editorCookie,
    body: {
      passwordActual: editorPassword,
      passwordNueva: editorNext,
      passwordConfirmacion: "Otra#Clave999",
    },
  });
  record(
    "confirmación distinta",
    mismatch.status === 400 &&
      mismatch.json?.error?.message === "Las nuevas contraseñas no coinciden.",
    String(mismatch.status),
  );

  const changed = await request("/api/admin/perfil/password", {
    method: "PATCH",
    cookie: editorCookie,
    body: {
      passwordActual: editorPassword,
      passwordNueva: editorNext,
      passwordConfirmacion: editorNext,
    },
  });
  const currentMe = await request("/api/auth/me", { cookie: editorCookie });
  const otherMe = await request("/api/auth/me", { cookie: otherCookie });
  const oldLogin = await login(editorEmail, editorPassword);
  const newLogin = await login(editorEmail, editorNext);
  record(
    "contraseña nueva y sesión actual vigente",
    changed.status === 200 &&
      !changed.text.includes("password_hash") &&
      currentMe.status === 200,
    `${changed.status}/${currentMe.status}`,
  );
  record("otra sesión queda inválida", otherMe.status === 401, String(otherMe.status));
  record("contraseña anterior no entra", oldLogin.status === 401, String(oldLogin.status));
  record("contraseña nueva entra", newLogin.status === 200, String(newLogin.status));

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
