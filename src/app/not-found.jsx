import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#e7dcd2] px-6 text-center text-[#946541]">
      <h1 className="font-serif text-4xl font-semibold text-[#704a31] sm:text-5xl">
        Página no encontrada
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-[#946541] sm:text-lg">
        Lo sentimos, en este momento no podemos mostrarte esta página. Puede
        que la dirección haya cambiado o que el contenido ya no esté disponible.
        Vuelve al inicio para seguir explorando Raíz Quilpué.
      </p>
      <Link href="/" className="btn-primary px-5 py-3">
        Volver al inicio
      </Link>
    </main>
  );
}
