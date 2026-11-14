export default function QuienesSomosLoading() {
  return (
    <main className="bg-[#e7dcd2]" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando contenido…
      </p>
      <div className="animate-pulse" aria-hidden="true">
        <div className="bg-[#bb9c82]/25 px-6 pt-20 pb-16">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4">
            <div className="h-3 w-32 bg-[#bb9c82]/60" />
            <div className="h-12 w-72 bg-[#bb9c82]/60" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-[#bb9c82]/60" />
            <div className="h-4 w-full bg-[#bb9c82]/40" />
            <div className="h-4 w-full bg-[#bb9c82]/40" />
            <div className="h-4 w-2/3 bg-[#bb9c82]/40" />
          </div>
          <div className="h-80 bg-[#bb9c82]/40" />
        </div>
      </div>
    </main>
  );
}
