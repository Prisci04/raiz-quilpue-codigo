"use client";

import { useState } from "react";

import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { guardarCampos } from "@/lib/api/paginas";

import { Field, btnPrimary, btnSecondary, inputClass } from "./ui";

/**
 * Edita los textos (campos_seccion) de una sección. Solo envía los campos que
 * cambiaron y muestra lo que el servidor dejó guardado.
 */
export default function CamposSeccionForm({ idPagina, seccion, valoresIniciales }) {
  const [guardado, setGuardado] = useState(valoresIniciales);
  const [borrador, setBorrador] = useState(valoresIniciales);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const cambios = Object.fromEntries(
    seccion.campos
      .filter((campo) => borrador[campo.codigo] !== guardado[campo.codigo])
      .map((campo) => [campo.codigo, borrador[campo.codigo]]),
  );
  const modificado = Object.keys(cambios).length > 0;

  function actualizar(codigo, valor) {
    setBorrador((actual) => ({ ...actual, [codigo]: valor }));
    setNotice(null);
  }

  async function guardar(event) {
    event.preventDefault();
    if (!modificado || busy) return;

    setBusy(true);
    setNotice(null);

    try {
      const { campos } = await guardarCampos(idPagina, seccion.codigo, cambios);

      setGuardado(campos);
      setBorrador(campos);
      setNotice({ tone: "success", text: "Cambios guardados. Ya se ven en el sitio público." });
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  // Una sola caja de texto corto: el campo y el botón comparten fila.
  const compacto = seccion.campos.length === 1 && seccion.campos[0].tipo === "texto";

  const campos = seccion.campos.map((campo) => {
    const etiqueta = campo.requerido ? `${campo.etiqueta} *` : campo.etiqueta;
    const comun = {
      name: campo.codigo,
      value: borrador[campo.codigo] ?? "",
      maxLength: campo.max,
      required: campo.requerido,
      disabled: busy,
      className: inputClass,
      onChange: (event) => actualizar(campo.codigo, event.target.value),
    };

    return (
      <Field
        key={campo.codigo}
        label={etiqueta}
        ayuda={campo.ayuda}
        className={compacto ? "min-w-0 flex-1 sm:max-w-xl" : campo.tipo === "texto" ? "" : "lg:col-span-2"}
      >
        {campo.tipo === "texto" ? (
          <input type="text" {...comun} />
        ) : (
          <textarea rows={campo.tipo === "titulo" ? 3 : 6} {...comun} />
        )}
      </Field>
    );
  });

  const acciones = (
    <div
      className={
        compacto
          ? "flex flex-col gap-2 sm:flex-row sm:items-center"
          : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      }
    >
      {modificado ? (
        <>
          {compacto ? null : <span className="text-xs text-[#7c5c47] sm:mr-auto">Hay cambios sin guardar.</span>}
          <button type="button" disabled={busy} onClick={() => setBorrador(guardado)} className={`${btnSecondary} w-full sm:w-auto`}>
            Descartar
          </button>
        </>
      ) : null}
      <button type="submit" disabled={!modificado || busy} className={`${btnPrimary} w-full sm:w-auto`}>
        {busy ? "Guardando…" : "Guardar textos"}
      </button>
    </div>
  );

  return (
    <form className="admin-form space-y-3" onSubmit={guardar} aria-busy={busy}>
      {compacto ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {campos}
          {acciones}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">{campos}</div>
          {acciones}
        </>
      )}

      {notice ? (
        <AdminNotice tone={notice.tone} sticky={false} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminNotice>
      ) : null}
    </form>
  );
}
