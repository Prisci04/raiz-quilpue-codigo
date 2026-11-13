"use client";

import { useState } from "react";
import { SITE_PAGE_FIELDS } from "@/lib/site-page-content.mjs";

const PAGE_LABELS = {
  inicio: "Inicio",
  "quienes-somos": "Quiénes somos",
};

export default function SitePagesEditor({ initialPages }) {
  const [pages, setPages] = useState(initialPages);
  const [activePage, setActivePage] = useState("inicio");
  const [notice, setNotice] = useState("");

  function updateField(key, value) {
    setPages((current) => ({
      ...current,
      [activePage]: {
        ...current[activePage],
        [key]: value,
      },
    }));
    setNotice("");
  }

  function savePages(event) {
    event.preventDefault();
    setNotice("Borrador actualizado en esta sesión. No se guarda ni se publica en el sitio.");
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#db700f] uppercase">
          Sitio público
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#704a31]">
          Editar páginas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#946541]">
          Prepara textos e imágenes de Inicio y Quiénes somos. Los cambios quedan como borrador temporal y no modifican las páginas públicas.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[#bb9c82]">
        {Object.keys(SITE_PAGE_FIELDS).map((pageKey) => (
          <button
            key={pageKey}
            type="button"
            aria-pressed={activePage === pageKey}
            onClick={() => setActivePage(pageKey)}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors ${
              activePage === pageKey
                ? "border-[#db700f] text-[#704a31]"
                : "border-transparent text-[#946541] hover:text-[#704a31]"
            }`}
          >
            {PAGE_LABELS[pageKey]}
          </button>
        ))}
      </div>

      {notice ? (
        <p role="status" className="border border-[#687a42]/30 bg-[#687a42]/10 px-4 py-3 text-sm text-[#405027]">
          {notice}
        </p>
      ) : null}

      <form className="space-y-7" onSubmit={savePages}>
        {SITE_PAGE_FIELDS[activePage].map((section) => (
          <fieldset
            key={section.title}
            className="grid gap-4 border border-[#bb9c82] bg-white/40 p-4 sm:grid-cols-2 sm:p-6"
          >
            <legend className="px-2 font-serif text-lg font-semibold text-[#704a31]">
              {section.title}
            </legend>
            {section.fields.map((field) => (
              <label
                key={field.key}
                className={`grid content-start gap-1.5 text-sm font-medium text-[#704a31] ${
                  field.multiline ? "sm:col-span-2" : ""
                }`}
              >
                {field.label}
                {field.multiline ? (
                  <textarea
                    name={field.key}
                    rows={field.key === "missionParagraphs" ? 9 : 4}
                    maxLength={5000}
                    required
                    value={pages[activePage][field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className="min-h-24 border border-[#bb9c82] bg-[#f4ece4] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#db700f]"
                  />
                ) : (
                  <input
                    name={field.key}
                    type="text"
                    maxLength={field.image ? 500 : 5000}
                    required
                    value={pages[activePage][field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className="min-h-11 border border-[#bb9c82] bg-[#f4ece4] px-3 text-sm outline-none focus:border-[#db700f]"
                  />
                )}
                {field.image ? (
                  <span className="text-xs font-normal text-[#946541]">
                    Usa una ruta de /public (por ejemplo /images/inicio/foto.jpg) o una URL HTTPS.
                  </span>
                ) : null}
              </label>
            ))}
          </fieldset>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center bg-[#704a31] px-6 text-sm font-semibold text-[#e7dcd2] transition-colors hover:bg-[#db700f]"
          >
            Aplicar borrador
          </button>
        </div>
      </form>
    </section>
  );
}
