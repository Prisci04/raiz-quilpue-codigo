export default function AdminListLoading() {
  return (
    <section className="admin-page animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-4 w-28 rounded-sm bg-[#efe6dc]" />
      <div className="mt-3 h-9 w-56 max-w-full rounded-sm bg-[#efe6dc]" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-sm bg-[#f3eee8]" />
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="h-14 rounded-xl border border-[#efe6dc] bg-white" />
        ))}
      </div>
      <div className="admin-card mt-5 h-72 border border-[#efe6dc] bg-white" />
      <span className="sr-only">Cargando…</span>
    </section>
  );
}
