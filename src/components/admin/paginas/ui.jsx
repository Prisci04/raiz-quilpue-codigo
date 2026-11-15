export const inputClass =
  "mt-1.5 w-full rounded-sm border border-[#e6ddd4] bg-[#fbfaf8] px-3 py-2.5 text-sm text-[#2c1810] outline-none focus:border-[#c4a484]";

export const btnPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 [&>svg]:shrink-0 rounded-sm bg-[#2c1810] px-4 text-sm font-medium text-white disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-10 items-center justify-center gap-2 [&>svg]:shrink-0 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] disabled:opacity-50";

export const btnDanger =
  "inline-flex min-h-10 items-center justify-center gap-2 [&>svg]:shrink-0 rounded-sm bg-[#a5452d] px-4 text-sm font-medium text-white disabled:opacity-50";

export const btnIcon =
  "inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#e6ddd4] bg-white text-[#2c1810] hover:bg-[#fbf8f4] disabled:opacity-40";

export function Field({ label, ayuda, children, className = "" }) {
  return (
    <label className={`admin-field block min-w-0 ${className}`}>
      <span className="text-[13px] font-medium text-[#2c1810]">{label}</span>
      {children}
      {ayuda ? <span className="mt-1 block text-xs leading-relaxed text-[#7c5c47]">{ayuda}</span> : null}
    </label>
  );
}

export function SeccionCard({ id, titulo, descripcion, children }) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="admin-card space-y-5 rounded-sm border border-[#e6ddd4] bg-white p-4 sm:p-6">
      <header>
        <h2 id={`${id}-titulo`} className="font-serif text-lg font-medium text-[#2c1810]">
          {titulo}
        </h2>
        {descripcion ? <p className="mt-1 text-sm text-[#7c6a5c]">{descripcion}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Subtitulo({ children }) {
  return (
    <h3 className="border-t border-[#e6ddd4] pt-5 text-[13px] font-semibold tracking-wide text-[#704a31] uppercase">
      {children}
    </h3>
  );
}
