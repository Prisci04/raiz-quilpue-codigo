"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, FileText, Landmark } from "lucide-react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";

const features = [
  { icon: FileText, label: "Gestión de contenidos y patrimonio" },
  { icon: CalendarDays, label: "Control de actividades e inscritos" },
  { icon: Landmark, label: "Administración del Museo Digital" },
  { icon: BarChart3, label: "Estadísticas y reportes descargables" },
];

export default function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!email.trim() || !password) {
      setError("Ingresa correo y contraseña.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(
          payload?.error?.message || "No fue posible iniciar sesión.",
        );
        setSubmitting(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("No fue posible conectar. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-full bg-[#efe6d8] text-[#704a31] lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden text-[#f6efe6] lg:flex">
        <Image
          src="/images/contenido/archivo-historico.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#6a3d28]/78" />

        <div className="relative z-10 flex min-h-screen w-full flex-col px-12 py-12 xl:px-16">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center bg-[#e2b340] font-serif text-2xl font-semibold text-[#5c331c]">
              R
            </span>
            <div className="leading-tight">
              <p className="font-serif text-xl font-semibold">Raíz Quilpué</p>
              <p className="text-[10px] tracking-[0.22em] uppercase">
                Portal administrativo
              </p>
            </div>
          </div>

          <div className="my-auto max-w-md">
            <h1 className="font-serif text-5xl leading-tight font-medium">
              Gestiona el patrimonio
              <span className="mt-1 block font-serif text-5xl text-[#e7c56b] italic">
                de Quilpué
              </span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#f6efe6]/90">
              Accede al panel de administración para gestionar contenidos,
              actividades, el Museo Digital y todos los recursos de la
              plataforma.
            </p>
            <ul className="mt-10 space-y-4 text-sm">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.label} className="flex items-center gap-3">
                    <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                    <span>{feature.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-h-full items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center bg-[#e2b340] font-serif text-xl font-semibold text-[#5c331c]">
              R
            </span>
            <p className="font-serif text-lg font-semibold">Raíz Quilpué</p>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#b4531a] uppercase">
            Acceso restringido
          </p>
          <h2 className="mt-2 font-serif text-4xl font-medium text-[#5c331c]">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="grid gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Correo electrónico
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
                className="min-h-12 rounded-md border border-[#d9cbb8] bg-[#f7f1e8] px-3 text-sm font-normal tracking-normal text-[#5c331c] normal-case outline-none"
              />
            </label>
            <label className="grid gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Contraseña
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={submitting}
                className="min-h-12 rounded-md border border-[#d9cbb8] bg-[#f7f1e8] px-3 text-sm font-normal tracking-normal outline-none"
              />
            </label>

            {error ? (
              <AdminNotice tone="error" sticky={false} onDismiss={() => setError("")}>
                {error}
              </AdminNotice>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="min-h-12 w-full rounded-md bg-[#6b3f2a] text-[12px] font-semibold tracking-[0.16em] text-[#f6efe6] uppercase disabled:opacity-60"
            >
              {submitting ? "Ingresando..." : "Ingresar al panel"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#7a624f]">
            <Link href="/" className="hover:text-[#5c331c]">
              ← Volver al portal público
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
