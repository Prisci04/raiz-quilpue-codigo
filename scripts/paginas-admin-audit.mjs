/*
  Auditoría de integración de Gestión de Páginas contra un servidor en ejecución
  y la base real. Hace operaciones reales (textos, valores, integrantes, imágenes)
  y deja todo como estaba al terminar.

  Uso:
    AUDIT_ADMIN_EMAIL=... AUDIT_ADMIN_PASSWORD=... node scripts/paginas-admin-audit.mjs
    (AUDIT_BASE por defecto: http://localhost:3000)
*/

const base = process.env.AUDIT_BASE ?? "http://localhost:3000";
const email = process.env.AUDIT_ADMIN_EMAIL;
const password = process.env.AUDIT_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Define AUDIT_ADMIN_EMAIL y AUDIT_ADMIN_PASSWORD.");
  process.exit(2);
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function check(name, condition, detail = "") {
  record(name, Boolean(condition), condition ? "" : detail);
  return Boolean(condition);
}

async function http(path, { method = "GET", cookie, json, form, origin = true } = {}) {
  const headers = new Headers();

  if (origin) headers.set("origin", base);
  if (cookie) headers.set("cookie", cookie);
  if (json !== undefined) headers.set("content-type", "application/json");

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : form,
    redirect: "manual",
  });
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  return { status: response.status, body, text, headers: response.headers };
}

const api = (cookie) => ({
  get: (path) => http(`/api/admin/paginas${path}`, { cookie }),
  send: (method, path, json) => http(`/api/admin/paginas${path}`, { method, cookie, json }),
  upload: (path, file, descripcion, reemplazar) => {
    const form = new FormData();

    form.set("file", file);
    if (descripcion) form.set("descripcion", descripcion);
    if (reemplazar) form.set("reemplazar", String(reemplazar));

    return http(`/api/admin/paginas${path}`, { method: "POST", cookie, form });
  },
});

async function publicHtml(path) {
  const response = await fetch(`${base}${path}`);
  return response.text();
}

async function head(url) {
  const response = await fetch(url, { method: "HEAD" });
  return response.status;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const login = await http("/api/auth/login", { method: "POST", json: { email, password } });
const cookie = (login.headers.getSetCookie?.() ?? []).map((item) => item.split(";")[0]).join("; ");

if (!check("login del administrador", login.status === 200 && cookie, `status ${login.status}`)) {
  process.exit(1);
}

const admin = api(cookie);
const original = {};
const cleanup = [];
const imagenesOriginales = {};

try {
  /* ------------------------------ Autorización ------------------------------ */
  const anon = await http("/api/admin/paginas/1");
  check("sin sesión no se lee el contenido (401)", anon.status === 401, `status ${anon.status}`);

  const anonWrite = await http("/api/admin/paginas/1/secciones/portada", {
    method: "PATCH",
    json: { campos: { texto_superior: "hack" } },
  });
  check("sin sesión no se escribe (401)", anonWrite.status === 401, `status ${anonWrite.status}`);

  const noOrigin = await http("/api/admin/paginas/1/secciones/portada", {
    method: "PATCH",
    cookie,
    origin: false,
    json: { campos: { texto_superior: "hack" } },
  });
  check("una mutación sin origen válido se rechaza", noOrigin.status === 403, `status ${noOrigin.status}`);

  /* ------------------------------ Lectura ------------------------------ */
  const inicio = await admin.get("/1");
  const quienes = await admin.get("/2");

  check("lee Inicio con sus secciones", inicio.status === 200 && inicio.body?.data?.secciones?.portada && inicio.body.data.secciones.presentacion);
  check(
    "lee Quiénes somos con valores, directorio y cargos",
    quienes.status === 200 &&
      quienes.body.data.secciones.valores.valores.length >= 4 &&
      quienes.body.data.secciones.directorio.integrantes.length >= 4 &&
      quienes.body.data.cargos.length === 8,
  );
  check("una página inexistente responde 400", (await admin.get("/9")).status === 400);
  check("el servidor no expone secretos", !JSON.stringify(inicio.body).match(/service_role|SUPABASE_SECRET/i));

  const portada = inicio.body.data.secciones.portada;

  original.texto_superior = portada.campos.texto_superior;
  original.titulo = portada.campos.titulo;

  /* ------------------------------ Textos ------------------------------ */
  const marca = `Auditoría ${Date.now()}`;
  const guardado = await admin.send("PATCH", "/1/secciones/portada", {
    campos: { texto_superior: marca, titulo: "Primera línea\nSegunda & <b>línea</b>\nTercera" },
  });

  check("actualiza textos de la portada", guardado.status === 200 && guardado.body.data.campos.texto_superior === marca);
  cleanup.push(() =>
    admin.send("PATCH", "/1/secciones/portada", {
      campos: { texto_superior: original.texto_superior, titulo: original.titulo },
    }),
  );

  const home = await publicHtml("/");

  check("el cambio se ve en la página pública de inmediato", home.includes(marca));
  check("el título multilínea se presenta en líneas y escapa el HTML", home.includes("Primera línea") && home.includes("Segunda &amp; &lt;b&gt;línea&lt;/b&gt;") && !home.includes("<b>línea</b>"));

  for (const [nombre, payload, esperado] of [
    ["campo inexistente", { campos: { inventado: "x" } }, 400],
    ["título obligatorio vacío", { campos: { titulo: "   " } }, 400],
    ["texto demasiado largo", { campos: { texto_superior: "x".repeat(121) } }, 400],
    ["campo de otra sección", { campos: { titulo_pagina: "x" } }, 400],
    ["sin campos", { campos: {} }, 400],
  ]) {
    const response = await admin.send("PATCH", "/1/secciones/portada", payload);
    check(`rechaza ${nombre}`, response.status === esperado, `status ${response.status}`);
  }

  check("sección inexistente", (await admin.send("PATCH", "/1/secciones/no_existe", { campos: { titulo: "x" } })).status === 400);
  check("no permite crear secciones nuevas en otra página", (await admin.send("PATCH", "/1/secciones/valores", { campos: { titulo_seccion: "x" } })).status === 400);

  const estado = await admin.get("/1");

  check("los rechazos no modificaron nada", estado.body.data.secciones.portada.campos.texto_superior === marca);

  /* ------------------------------ Valores ------------------------------ */
  const valoresAntes = quienes.body.data.secciones.valores.valores;
  const idsAntes = valoresAntes.map((valor) => valor.id);

  const creado = await admin.send("POST", "/valores", {
    texto_superior: "AUDITORÍA",
    titulo: "Valor de prueba",
    descripcion: "Primera línea\n\nSegundo párrafo",
  });
  const nuevo = creado.body?.data?.items?.find((item) => !idsAntes.includes(item.id));

  check("crea un valor al final de la lista", creado.status === 201 && nuevo && nuevo.orden === valoresAntes.length + 1, `status ${creado.status}`);

  if (nuevo) {
    cleanup.push(() => admin.send("DELETE", `/valores/${nuevo.id}`));

    const editado = await admin.send("PATCH", `/valores/${nuevo.id}`, { texto_superior: "", titulo: "Valor editado", descripcion: "Texto" });

    check("edita un valor", editado.status === 200 && editado.body.data.items.find((item) => item.id === nuevo.id)?.titulo === "Valor editado");

    const invertido = [...editado.body.data.items.map((item) => item.id)].reverse();
    const reordenado = await admin.send("PATCH", "/valores", { ids: invertido });

    check("reordena los valores", reordenado.status === 200 && reordenado.body.data.items.map((item) => item.id).join() === invertido.join());

    const quienesHtml = await publicHtml("/quienes-somos");

    check("la página pública muestra los valores en el nuevo orden", quienesHtml.indexOf("Valor editado") < quienesHtml.indexOf("Identidad y pertenencia territorial"));
    check("la página pública muestra la grilla con cinco valores", /01 — (<!-- -->)?05/.test(quienesHtml) && quienesHtml.includes("md:col-span-12"));

    check("rechaza un orden incompleto", (await admin.send("PATCH", "/valores", { ids: invertido.slice(1) })).status === 400);
    check("rechaza un orden con ids ajenos", (await admin.send("PATCH", "/valores", { ids: [...invertido.slice(1), 999999] })).status === 400);
    check("rechaza un valor sin título", (await admin.send("POST", "/valores", { titulo: "" })).status === 400);
    check("no edita un valor inexistente (404)", (await admin.send("PATCH", "/valores/999999", { titulo: "x" })).status === 404);

    const eliminado = await admin.send("DELETE", `/valores/${nuevo.id}`);

    check("elimina un valor y compacta el orden", eliminado.status === 200 && eliminado.body.data.items.map((item) => item.orden).join() === "1,2,3,4");
    check("tras eliminar quedan solo los valores originales", eliminado.body.data.items.map((item) => item.id).join() === invertido.filter((id) => id !== nuevo.id).join());

    // Deja el orden original.
    await admin.send("PATCH", "/valores", { ids: idsAntes });
  }

  const valoresFinal = (await admin.get("/2")).body.data.secciones.valores.valores;

  check("los valores originales quedaron en su orden", valoresFinal.map((valor) => valor.id).join() === idsAntes.join());

  /* ------------------------------ Directorio ------------------------------ */
  const integrantesAntes = quienes.body.data.secciones.directorio.integrantes;
  const idsIntegrantes = integrantesAntes.map((integrante) => integrante.id);
  const cargos = quienes.body.data.cargos;
  const presidenta = cargos.find((cargo) => cargo.nombre === "Presidenta");
  const vicepresidente = cargos.find((cargo) => cargo.nombre === "Vicepresidente");

  check("el catálogo respeta Presidente/Presidenta y Vicepresidente/Vicepresidenta", ["Presidente", "Presidenta", "Vicepresidente", "Vicepresidenta"].every((nombre) => cargos.some((cargo) => cargo.nombre === nombre)));

  const alta = await admin.send("POST", "/integrantes", { id_cargo: String(vicepresidente.id), nombre_integrante: "Persona de Auditoría", descripcion: "Descripción <script>x</script>" });
  const integrante = alta.body?.data?.items?.find((item) => !idsIntegrantes.includes(item.id));

  check("crea un integrante con cargo de catálogo", alta.status === 201 && integrante?.cargo === "Vicepresidente", `status ${alta.status}`);

  if (integrante) {
    cleanup.push(() => admin.send("DELETE", `/integrantes/${integrante.id}`));

    const edit = await admin.send("PATCH", `/integrantes/${integrante.id}`, { id_cargo: presidenta.id, nombre_integrante: "Persona Editada", descripcion: "" });
    const editado = edit.body?.data?.items?.find((item) => item.id === integrante.id);

    check("edita nombre y cargo; el cargo no se duplica como texto", edit.status === 200 && editado.cargo === "Presidenta" && editado.descripcion === null);

    const html = await publicHtml("/quienes-somos");

    check("la página pública muestra al integrante con su cargo", html.includes("Persona Editada"));

    const sinDuplicar = (await admin.get("/2")).body.data.cargos.length;

    check("el catálogo de cargos no cambió", sinDuplicar === 8);

    const orden = [integrante.id, ...idsIntegrantes];
    const reordenado = await admin.send("PATCH", "/integrantes", { ids: orden });

    check("reordena el directorio", reordenado.status === 200 && reordenado.body.data.items[0].id === integrante.id);
    check("rechaza un cargo inexistente", (await admin.send("POST", "/integrantes", { id_cargo: 9999, nombre_integrante: "X" })).status === 400);
    check("rechaza un cargo como texto libre", (await admin.send("POST", "/integrantes", { id_cargo: "Presidenta", nombre_integrante: "X" })).status === 400);
    check("rechaza un integrante sin nombre", (await admin.send("POST", "/integrantes", { id_cargo: presidenta.id, nombre_integrante: " " })).status === 400);

    /* Fotografía del integrante */
    const fotoPath = `/integrantes/${integrante.id}/imagen`;
    const bibliotecaFotos = (await admin.get("/imagenes")).body.data.imagenes;
    const deContenidos = bibliotecaFotos.find((imagen) => imagen.ruta.startsWith("contenidos/"));

    check("los integrantes originales ya tienen fotografía", integrantesAntes.every((item) => item.imagen?.url));
    check("la página pública muestra las fotografías de la base", (await publicHtml("/quienes-somos")).includes("paginas/quienes-somos/directorio/"));

    const fotoSubida = await admin.upload(fotoPath, new File([PNG], "foto.png", { type: "image/png" }));
    const propiaFoto = fotoSubida.body?.data?.items?.find((item) => item.id === integrante.id)?.imagen;

    check("sube la fotografía de un integrante", fotoSubida.status === 201 && /^paginas\/quienes-somos\/directorio\/[0-9a-f-]{36}\.png$/.test(propiaFoto?.ruta ?? ""), `status ${fotoSubida.status} ${fotoSubida.text.slice(0, 120)}`);

    if (propiaFoto) {
      check("la fotografía subida es pública en Storage", (await head(propiaFoto.url)) === 200);

      const conBiblioteca = await admin.send("PATCH", fotoPath, { id_imagen: deContenidos.id });
      const tras = conBiblioteca.body?.data?.items?.find((item) => item.id === integrante.id)?.imagen;

      check("asigna una imagen de la biblioteca como foto", conBiblioteca.status === 200 && tras?.id === deContenidos.id);
      check("la foto propia reemplazada se elimina físicamente", [400, 404].includes(await head(propiaFoto.url)));

      const sinFoto = await admin.send("PATCH", fotoPath, { id_imagen: null });

      check("quita la fotografía", sinFoto.status === 200 && sinFoto.body.data.items.find((item) => item.id === integrante.id).imagen === null);
      check("la imagen de contenidos NO se borra al quitarla del integrante", (await head(deContenidos.url)) === 200);
    }

    check("rechaza un PDF como fotografía", (await admin.upload(fotoPath, new File([Buffer.from("%PDF-1.4")], "doc.pdf", { type: "application/pdf" }))).status === 415);
    check("rechaza una imagen inexistente como fotografía", (await admin.send("PATCH", fotoPath, { id_imagen: 999999 })).status === 400);
    check("rechaza no indicar la imagen", (await admin.send("PATCH", fotoPath, {})).status === 400);
    check("responde 404 si el integrante no existe", (await admin.send("PATCH", "/integrantes/999999/imagen", { id_imagen: null })).status === 404);

    const conFotoFinal = await admin.upload(fotoPath, new File([PNG], "final.png", { type: "image/png" }));
    const fotoFinal = conFotoFinal.body?.data?.items?.find((item) => item.id === integrante.id)?.imagen;

    const baja = await admin.send("DELETE", `/integrantes/${integrante.id}`);

    if (fotoFinal) {
      check("eliminar al integrante elimina su fotografía propia de Storage", [400, 404].includes(await head(fotoFinal.url)));
    }

    check("elimina un integrante y compacta el orden", baja.status === 200 && baja.body.data.items.map((item) => item.orden).join() === "1,2,3,4");
    check("eliminar dos veces responde 404", (await admin.send("DELETE", `/integrantes/${integrante.id}`)).status === 404);
  }

  const integrantesFinal = (await admin.get("/2")).body.data.secciones.directorio.integrantes;

  check("el directorio original quedó intacto", integrantesFinal.map((item) => item.id).join() === idsIntegrantes.join() && integrantesFinal.map((item) => item.nombre).join() === integrantesAntes.map((item) => item.nombre).join());

  /* ------------------------------ Imágenes ------------------------------ */
  const biblioteca = await admin.get("/imagenes");
  const libres = biblioteca.body?.data?.imagenes ?? [];

  check("lista la biblioteca de imágenes existentes", biblioteca.status === 200 && libres.length >= 15);
  check("la biblioteca no ofrece aportes sin revisar", !libres.some((imagen) => imagen.ruta.startsWith("museo/aportes/")));

  const existente = libres.find((imagen) => imagen.ruta.startsWith("contenidos/"));
  const portadaPath = "/1/secciones/portada/imagenes";
  const presentacionPath = "/1/secciones/presentacion/imagenes";

  // Las imágenes que ya tiene asignadas cada sección se restauran al terminar.
  const antes = await admin.get("/1");

  for (const [codigo, ruta] of [["portada", portadaPath], ["presentacion", presentacionPath]]) {
    const ids = antes.body.data.secciones[codigo].imagenes.map((imagen) => imagen.id);
    imagenesOriginales[codigo] = ids;
    cleanup.push(() => admin.send("PATCH", ruta, { ids }));
  }

  const subida = await admin.upload(portadaPath, new File([PNG], "prueba.png", { type: "image/png" }), "Foto de auditoría");
  const imagenes = subida.body?.data?.imagenes ?? [];
  const propia = imagenes.at(-1);

  check("sube una imagen y la asocia a la sección", subida.status === 201 && propia?.ruta.startsWith("paginas/inicio/portada/") && propia.descripcion === "Foto de auditoría", `status ${subida.status} ${subida.text.slice(0, 120)}`);

  if (propia) {
    check("la imagen subida es pública en Storage", (await head(propia.url)) === 200);
    check("la portada pública usa la imagen de la base", (await publicHtml("/")).includes(encodeURIComponent(propia.ruta).replaceAll("%2F", "/")) || (await publicHtml("/")).includes(propia.ruta));

    const conExistente = await admin.send("PATCH", portadaPath, { ids: [existente.id, propia.id] });

    check("asocia una imagen existente y reordena", conExistente.status === 200 && conExistente.body.data.imagenes.map((imagen) => imagen.id).join() === `${existente.id},${propia.id}`);

    const descripcion = await admin.send("PATCH", `/imagenes/${propia.id}`, { descripcion_imagen: "Nueva descripción" });

    check("edita la descripción de la imagen", descripcion.status === 200 && descripcion.body.data.imagen.descripcion === "Nueva descripción");

    const reemplazo = await admin.send("PATCH", portadaPath, { ids: [existente.id] });

    check("reemplazar/quitar la imagen propia elimina su relación", reemplazo.status === 200 && reemplazo.body.data.imagenes.length === 1);
    check("la imagen propia sin uso se elimina físicamente", (await head(propia.url)) === 400 || (await head(propia.url)) === 404);

    const sigue = await head(existente.url);

    check("la imagen existente de contenidos NO se borra al quitarla de la sección", sigue === 200, `status ${sigue}`);

    await admin.send("PATCH", portadaPath, { ids: imagenesOriginales.portada });

    check("la imagen existente sigue en la biblioteca tras quitarla", (await admin.get("/imagenes")).body.data.imagenes.some((imagen) => imagen.id === existente.id));
  }

  /* Reemplazar subiendo una imagen nueva en una sección llena (presentación: 3/3) */
  const originalesPres = imagenesOriginales.presentacion;

  if (originalesPres.length === 3) {
    const [primera, segunda] = originalesPres;
    const primeraUrl = antes.body.data.secciones.presentacion.imagenes[0].url;

    check("sin reemplazo, subir a una sección llena se rechaza", (await admin.upload(presentacionPath, new File([PNG], "extra.png", { type: "image/png" }))).status === 400);
    check("rechaza reemplazar una imagen que no está en la sección", (await admin.upload(presentacionPath, new File([PNG], "x.png", { type: "image/png" }), undefined, 999999)).status === 400);

    const reemplazo = await admin.upload(presentacionPath, new File([PNG], "nueva.png", { type: "image/png" }), "Reemplazo de auditoría", primera);
    const lista = reemplazo.body?.data?.imagenes ?? [];

    check("reemplaza subiendo una imagen en una sección llena", reemplazo.status === 201 && lista.length === 3 && lista[0].descripcion === "Reemplazo de auditoría" && lista[1].id === segunda, `status ${reemplazo.status} ${reemplazo.text.slice(0, 120)}`);
    check("el reemplazo conserva la posición de la imagen original", lista[0]?.id !== primera && lista.slice(1).map((imagen) => imagen.id).join() === originalesPres.slice(1).join());
    check("la imagen inicial reemplazada NO se borra de Storage", (await head(primeraUrl)) === 200);
    check("la imagen nueva es pública en Storage", lista[0] ? (await head(lista[0].url)) === 200 : false);

    // Se restaura (en el cleanup) y la imagen subida durante la auditoría se elimina físicamente.
    const restaurada = await admin.send("PATCH", presentacionPath, { ids: originalesPres });

    check("al restaurar, la imagen subida en el reemplazo se elimina de Storage", restaurada.status === 200 && lista[0] && [400, 404].includes(await head(lista[0].url)));
  }

  check("rechaza más imágenes que el máximo de la sección", (await admin.send("PATCH", presentacionPath, { ids: libres.slice(0, 4).map((imagen) => imagen.id) })).status === 400);
  check("rechaza imágenes inexistentes", (await admin.send("PATCH", presentacionPath, { ids: [999999] })).status === 400);
  check("rechaza imágenes en una sección que no las admite", (await admin.send("PATCH", "/2/secciones/directorio/imagenes", { ids: [existente.id] })).status === 400);

  const falso = await admin.upload(portadaPath, new File([Buffer.from("no soy una imagen")], "falsa.png", { type: "image/png" }));

  check("rechaza un archivo que no es imagen (firma falsa)", falso.status === 415, `status ${falso.status}`);

  const pdf = await admin.upload(portadaPath, new File([Buffer.from("%PDF-1.4")], "doc.pdf", { type: "application/pdf" }));

  check("rechaza un PDF", pdf.status === 415, `status ${pdf.status}`);

  const grande = await admin.upload(portadaPath, new File([Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])], "grande.png", { type: "image/png" }));

  check("rechaza una imagen de más de 5 MB", grande.status === 413, `status ${grande.status}`);
} finally {
  for (const undo of cleanup.reverse()) {
    try {
      await undo();
    } catch (error) {
      console.error("Error al restaurar:", error.message);
    }
  }
}

/* ------------------------------ Restauración ------------------------------ */
const final = await admin.get("/1");
const finalPortada = final.body.data.secciones.portada;

check("los textos de la portada quedaron como estaban", finalPortada.campos.texto_superior === original.texto_superior && finalPortada.campos.titulo === original.titulo);
const mismas = (codigo) => final.body.data.secciones[codigo].imagenes.map((imagen) => imagen.id).join() === imagenesOriginales[codigo]?.join();

check("las imágenes de portada y presentación quedaron como estaban", mismas("portada") && mismas("presentacion"));
check("la portada pública ya no muestra el texto de auditoría", !(await publicHtml("/")).includes("Auditoría "));

const failed = results.filter((item) => !item.ok);

console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
process.exit(failed.length ? 1 : 0);
