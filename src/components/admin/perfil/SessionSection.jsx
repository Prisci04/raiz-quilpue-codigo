"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeOtherSessions } from "@/lib/api/perfil";

export default function SessionSection() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [closingOthers, setClosingOthers] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
        return;
      }
    } catch {
      // La sesión sigue activa si la solicitud no se completa.
    }

    setError("No fue posible cerrar la sesión.");
    setLoggingOut(false);
  }

  async function handleCloseOthers() {
    setClosingOthers(true);
    setError("");
    setMessage("");

    try {
      await closeOtherSessions();
      setMessage("Se cerraron las sesiones de los otros dispositivos.");
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setClosingOthers(false);
    }
  }

  return (
    <section className="rounded-sm border border-[#2c1810]/6 bg-white p-5 shadow-[0_10px_30px_rgba(44,24,16,0.04)] sm:p-6">
      <h2 className="text-lg font-semibold text-[#2c1810]">Sesión</h2>
      <p className="mt-2 text-sm text-[#7c5c47]">Tu sesión se encuentra activa.</p>
      {message ? (
        <p className="mt-3 text-sm text-[#3f4c28]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[#8d3b28]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex h-11 items-center rounded-sm bg-[#2c1810] px-5 text-sm font-medium text-[#f4ebe3] transition hover:bg-[#3d2418] disabled:opacity-60"
        >
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
        <button
          type="button"
          onClick={handleCloseOthers}
          disabled={closingOthers}
          className="inline-flex h-11 items-center rounded-sm border border-[#2c1810]/10 px-5 text-sm font-medium text-[#2c1810] transition hover:bg-[#f6f1eb] disabled:opacity-60"
        >
          {closingOthers ? "Cerrando…" : "Cerrar sesión en otros dispositivos"}
        </button>
      </div>
    </section>
  );
}
