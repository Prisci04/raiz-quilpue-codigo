"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import AdminDialog from "@/components/admin/AdminDialog";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";

import { Field, btnDanger, btnIcon, btnPrimary, btnSecondary, inputClass } from "./ui";

/**
 * Lista administrable con alta, edición, eliminación (con confirmación) y orden.
 * Es genérica: Valores y Directorio solo cambian los campos, el resumen y la API.
 *
 * `api` debe tener crear/actualizar/eliminar/reordenar y devolver siempre la lista
 * completa y ordenada que quedó guardada en el servidor.
 * `extra(item, { busy, ejecutar })` es opcional: agrega controles propios bajo el resumen
 * de cada elemento (por ejemplo, la foto del integrante).
 */
export default function ListaEditable({
  titulo,
  itemsIniciales,
  api,
  campos,
  formularioVacio,
  aFormulario,
  resumen,
  nombreItem,
  max,
  textos,
  extra,
}) {
  const baseId = useId();
  const [items, setItems] = useState(itemsIniciales);
  const [editor, setEditor] = useState(null);
  const [formError, setFormError] = useState("");
  const [aEliminar, setAEliminar] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const completa = items.length >= max;

  function abrir(item) {
    setNotice(null);
    setFormError("");
    setEditor({
      id: item ? item.id : null,
      valores: item ? aFormulario(item) : { ...formularioVacio },
    });
  }

  async function guardar(valores) {
    setBusy(true);
    setFormError("");

    try {
      const lista = editor.id
        ? await api.actualizar(editor.id, valores)
        : await api.crear(valores);

      setItems(lista);
      setNotice({ tone: "success", text: editor.id ? textos.actualizado : textos.creado });
      setEditor(null);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  }

  /** Ejecuta una acción que devuelve la lista completa y muestra el resultado. */
  async function ejecutar(accion, textoOk) {
    setBusy(true);
    setNotice(null);

    try {
      setItems(await accion());
      setNotice({ tone: "success", text: textoOk });
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function mover(index, delta) {
    const ids = items.map((item) => item.id);
    const destino = index + delta;

    [ids[index], ids[destino]] = [ids[destino], ids[index]];
    setBusy(true);
    setNotice(null);

    try {
      setItems(await api.reordenar(ids));
      setNotice({ tone: "success", text: textos.reordenado });
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    setBusy(true);
    setDeleteError("");

    try {
      setItems(await api.eliminar(aEliminar.id));
      setNotice({ tone: "success", text: textos.eliminado });
      setAEliminar(null);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-wide text-[#704a31] uppercase">
          {titulo} <span className="font-normal text-[#7c5c47]">({items.length}/{max})</span>
        </h3>
        <button
          type="button"
          onClick={() => abrir(null)}
          disabled={busy || completa || editor?.id === null}
          className={`${btnSecondary} w-full sm:w-auto`}
        >
          <Plus size={16} aria-hidden="true" />
          {textos.agregar}
        </button>
      </div>

      {completa ? <p className="text-xs text-[#7c5c47]">Se alcanzó el máximo de elementos.</p> : null}

      {notice ? (
        <AdminNotice tone={notice.tone} sticky={false} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminNotice>
      ) : null}

      {items.length === 0 && !editor ? (
        <p className="admin-empty px-3 py-8 text-center text-sm text-[#7c5c47]">{textos.vacio}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) =>
            editor?.id === item.id ? (
              <li key={item.id}>
                <Formulario
                  id={`${baseId}-editar`}
                  titulo={textos.editarTitulo}
                  campos={campos}
                  inicial={editor.valores}
                  busy={busy}
                  error={formError}
                  onSubmit={guardar}
                  onCancel={() => setEditor(null)}
                />
              </li>
            ) : (
              <li
                key={item.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] p-3 sm:flex sm:items-center"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#704a31] text-xs font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 text-sm text-[#2c1810]">
                  {resumen(item)}
                  {extra ? extra(item, { busy, ejecutar }) : null}
                </div>
                <div className="col-span-2 grid grid-cols-4 gap-2 sm:col-span-1 sm:flex sm:shrink-0 [&>button]:w-full sm:[&>button]:w-10">
                  <button
                    type="button"
                    className={btnIcon}
                    disabled={busy || index === 0}
                    onClick={() => mover(index, -1)}
                    aria-label={`Subir ${nombreItem(item)}`}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={btnIcon}
                    disabled={busy || index === items.length - 1}
                    onClick={() => mover(index, 1)}
                    aria-label={`Bajar ${nombreItem(item)}`}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={btnIcon}
                    disabled={busy}
                    onClick={() => abrir(item)}
                    aria-label={`Editar ${nombreItem(item)}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${btnIcon} text-[#8d3b28]`}
                    disabled={busy}
                    onClick={() => {
                      setDeleteError("");
                      setAEliminar(item);
                    }}
                    aria-label={`Eliminar ${nombreItem(item)}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ),
          )}
          {editor?.id === null ? (
            <li>
              <Formulario
                id={`${baseId}-nuevo`}
                titulo={textos.nuevoTitulo}
                campos={campos}
                inicial={editor.valores}
                busy={busy}
                error={formError}
                onSubmit={guardar}
                onCancel={() => setEditor(null)}
              />
            </li>
          ) : null}
        </ol>
      )}

      {aEliminar ? (
        <AdminDialog
          onClose={() => setAEliminar(null)}
          busy={busy}
          role="alertdialog"
          aria-labelledby={`${baseId}-eliminar-titulo`}
          aria-describedby={`${baseId}-eliminar-detalle`}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        >
          <h2 id={`${baseId}-eliminar-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
            {textos.eliminarTitulo}
          </h2>
          <p id={`${baseId}-eliminar-detalle`} className="mt-2 text-sm text-[#7c6a5c]">
            “{nombreItem(aEliminar)}” dejará de mostrarse en el sitio público. Esta acción no se puede deshacer.
          </p>
          {deleteError ? (
            <p role="alert" className="mt-3 text-sm text-[#8d3b28]">
              {deleteError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={() => setAEliminar(null)} className={`${btnSecondary} w-full sm:w-auto`}>
              Cancelar
            </button>
            <button type="button" disabled={busy} onClick={eliminar} className={`${btnDanger} w-full sm:w-auto`}>
              {busy ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </AdminDialog>
      ) : null}
    </div>
  );
}

function Formulario({ id, titulo, campos, inicial, busy, error, onSubmit, onCancel }) {
  const [valores, setValores] = useState(inicial);

  return (
    <form
      className="admin-form space-y-4 rounded-sm border border-[#c4a484] bg-white p-4"
      aria-labelledby={`${id}-titulo`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(valores);
      }}
    >
      <h4 id={`${id}-titulo`} className="font-serif text-base font-medium text-[#2c1810]">
        {titulo}
      </h4>
      <div className="grid gap-4 lg:grid-cols-2">
        {campos.map((campo) => {
          const comun = {
            name: campo.name,
            value: valores[campo.name] ?? "",
            required: campo.required,
            maxLength: campo.maxLength,
            disabled: busy,
            className: inputClass,
            onChange: (event) => setValores((actual) => ({ ...actual, [campo.name]: event.target.value })),
          };

          return (
            <Field
              key={campo.name}
              label={campo.required ? `${campo.label} *` : campo.label}
              ayuda={campo.ayuda}
              className={campo.tipo === "textarea" ? "lg:col-span-2" : ""}
            >
              {campo.tipo === "textarea" ? (
                <textarea rows={4} {...comun} />
              ) : campo.tipo === "select" ? (
                <select {...comun}>
                  <option value="">Seleccionar</option>
                  {campo.opciones.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" {...comun} />
              )}
            </Field>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[#8d3b28]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={onCancel} className={`${btnSecondary} w-full sm:w-auto`}>
          Cancelar
        </button>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
