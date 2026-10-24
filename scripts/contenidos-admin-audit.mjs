import { generatePassword } from "../src/lib/usuarios/generate-password.mjs";

const base = process.env.AUDIT_BASE ?? "http://localhost:3000";
const adminEmail = process.env.AUDIT_ADMIN_EMAIL;
const adminPassword = process.env.AUDIT_ADMIN_PASSWORD;

const results = [];
const createdIds = [];
let editorId = null;

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

  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");

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
  };
}

async function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

function documento(extraParagraph) {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Memoria local" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: extraParagraph,
            marks: [
              { type: "bold" },
              { type: "textStyle", attrs: { color: "#687a42" } },
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Estación" }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function payload(tipo, estado, titulo) {
  return {
    titulo,
    descripcion: "Descripción de la tarjeta de prueba.",
    resumen: "Resumen del popup de prueba.",
    tipo,
    estado,
    contenido: documento("Texto de prueba"),
  };
}

async function main() {
  if (!adminEmail || !adminPassword) {
    throw new Error("Faltan credenciales de auditoría");
  }

  const anon = await request("/api/admin/contenidos", {
    method: "POST",
    body: payload("noticia", "borrador", "Sin sesión"),
  });
  record("sin sesión no crea", anon.status === 401, String(anon.status));

  const adminLogin = await login(adminEmail, adminPassword);
  const adminCookie = adminLogin.cookie;
  record("login administrador", adminLogin.status === 200, String(adminLogin.status));

  const draft = await request("/api/admin/contenidos", {
    method: "POST",
    cookie: adminCookie,
    body: payload("noticia", "borrador", "Borrador de auditoría"),
  });
  if (draft.json?.data?.id) createdIds.push(draft.json.data.id);
  record(
    "crear borrador",
    draft.status === 201 &&
      draft.json?.data?.estado === "borrador" &&
      draft.json?.data?.fecha_publicacion === null &&
      !draft.text.includes("password_hash"),
    String(draft.status),
  );

  if (draft.status !== 201) {
    record(
      "escritura en la base",
      false,
      "falta el permiso de service_role sobre contenidos",
    );
    return;
  }

  const published = await request("/api/admin/contenidos", {
    method: "POST",
    cookie: adminCookie,
    body: payload("patrimonio", "publicada", "Publicado de auditoría"),
  });
  if (published.json?.data?.id) createdIds.push(published.json.data.id);
  record(
    "crear publicado con fecha",
    published.status === 201 &&
      published.json?.data?.estado === "publicada" &&
      Boolean(published.json?.data?.fecha_publicacion),
    String(published.status),
  );

  const capsula = await request("/api/admin/contenidos", {
    method: "POST",
    cookie: adminCookie,
    body: payload("capsula_historica", "borrador", "Cápsula de auditoría"),
  });
  if (capsula.json?.data?.id) createdIds.push(capsula.json.data.id);
  record(
    "crear cápsula",
    capsula.status === 201 && capsula.json?.data?.tipo === "capsula_historica",
    String(capsula.status),
  );

  const invalid = await request("/api/admin/contenidos", {
    method: "POST",
    cookie: adminCookie,
    body: { ...payload("noticia", "borrador", "Inválido"), contenido: { type: "html" } },
  });
  record("contenido inválido rechazado", invalid.status === 400, String(invalid.status));

  const draftId = draft.json?.data?.id;
  const updated = await request(`/api/admin/contenidos/${draftId}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: {
      ...payload("patrimonio", "borrador", "Título editado"),
      descripcion: "Descripción editada de la tarjeta.",
      resumen: "Resumen editado del popup.",
      contenido: documento("Texto con negrita"),
    },
  });
  record(
    "editar campos y jsonb",
    updated.status === 200 &&
      updated.json?.data?.titulo === "Título editado" &&
      updated.json?.data?.tipo === "patrimonio" &&
      updated.json?.data?.contenido?.type === "doc",
    String(updated.status),
  );

  const reopened = await request(`/api/admin/contenidos/${draftId}`, { cookie: adminCookie });
  const marks = reopened.json?.data?.contenido?.content?.[1]?.content?.[0]?.marks ?? [];
  record(
    "reabrir conserva negrita, h2 y color",
    reopened.status === 200 &&
      reopened.json?.data?.contenido?.content?.[0]?.type === "heading" &&
      marks.some((mark) => mark.type === "bold") &&
      marks.some((mark) => mark.type === "textStyle" && mark.attrs?.color === "#687a42"),
    String(reopened.status),
  );

  const toPublic = await request(`/api/admin/contenidos/${draftId}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { estado: "publicada" },
  });
  const fecha = toPublic.json?.data?.fecha_publicacion;
  record(
    "borrador pasa a publicada con fecha",
    toPublic.status === 200 && toPublic.json?.data?.estado === "publicada" && Boolean(fecha),
    String(toPublic.status),
  );

  const toDraft = await request(`/api/admin/contenidos/${draftId}`, {
    method: "PATCH",
    cookie: adminCookie,
    body: { estado: "borrador" },
  });
  record(
    "volver a borrador conserva la fecha",
    toDraft.status === 200 &&
      toDraft.json?.data?.estado === "borrador" &&
      toDraft.json?.data?.fecha_publicacion === fecha,
    String(toDraft.status),
  );

  const removed = await request(`/api/admin/contenidos/${draftId}`, {
    method: "DELETE",
    cookie: adminCookie,
  });
  const publicAfter = await request(`/api/contenido/${draftId}`);
  record("eliminar contenido", removed.status === 200, String(removed.status));
  record(
    "el público ya no lo ve",
    publicAfter.status === 404,
    String(publicAfter.status),
  );
  const draftIndex = createdIds.indexOf(draftId);
  if (draftIndex >= 0) createdIds.splice(draftIndex, 1);

  const editorPassword = generatePassword();
  const editorEmail = `contenido.editor.${Date.now()}@raizquilpue.cl`;
  const createdEditor = await request("/api/admin/usuarios", {
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
  editorId = createdEditor.json?.data?.id ?? null;
  record("crear editor", createdEditor.status === 201, String(createdEditor.status));

  const editorLogin = await login(editorEmail, editorPassword);
  const editorCreate = await request("/api/admin/contenidos", {
    method: "POST",
    cookie: editorLogin.cookie,
    body: payload("noticia", "borrador", "Borrador del editor"),
  });
  if (editorCreate.json?.data?.id) createdIds.push(editorCreate.json.data.id);
  record("editor crea contenido", editorCreate.status === 201, String(editorCreate.status));
}

async function cleanup(adminCookie) {
  for (const id of createdIds) {
    await request(`/api/admin/contenidos/${id}`, { method: "DELETE", cookie: adminCookie });
  }

  if (editorId) {
    await request(`/api/admin/usuarios/${editorId}/estado`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { estado: "inactivo" },
    });
    await request(`/api/admin/usuarios/${editorId}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
  }
}

const adminLogin = await login(adminEmail, adminPassword);

try {
  await main();
} finally {
  if (adminLogin.cookie) {
    await cleanup(adminLogin.cookie);
  }
}

const failed = results.filter((item) => !item.ok).length;
console.log(`${results.length - failed}/${results.length} pruebas ok`);
if (failed > 0) process.exitCode = 1;
