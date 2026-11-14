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

  return (
    <form className="admin-form space-y-4" onSubmit={guardar} aria-busy={busy}>
      <div className="grid gap-4 lg:grid-cols-2">
        {seccion.campos.map((campo) => {
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
              className={campo.tipo === "texto" ? "" : "lg:col-span-2"}
            >
              {campo.tipo === "texto" ? (
                <input type="text" {...comun} />
              ) : (
                <textarea rows={campo.tipo === "titulo" ? 3 : 6} {...comun} />
              )}
            </Field>
          );
        })}
      </div>

      {notice ? (
        <AdminNotice tone={notice.tone} sticky={false} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminNotice>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {modificado ? (
          <>
            <span className="mr-auto text-xs text-[#7c5c47]">Hay cambios sin guardar.</span>
            <button type="button" disabled={busy} onClick={() => setBorrador(guardado)} className={btnSecondary}>
              Descartar
            </button>
          </>
        ) : null}
        <button type="submit" disabled={!modificado || busy} className={btnPrimary}>
          {busy ? "Guardando…" : "Guardar textos"}
        </button>
      </div>
    </form>
  );
}
