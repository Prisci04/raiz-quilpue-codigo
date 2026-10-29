"use client";

import { useEffect, useState } from "react";
import AdminNotice from "@/components/admin/contenidos/AdminNotice";
import { getPerfil } from "@/lib/api/perfil";
import PasswordForm from "@/components/admin/perfil/PasswordForm";
import PerfilForm from "@/components/admin/perfil/PerfilForm";
import SessionSection from "@/components/admin/perfil/SessionSection";

export default function PerfilPanel() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getPerfil()
      .then((data) => {
        if (active) {
          setPerfil(data);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-[#db700f]">Cuenta</p>
      <h1 className="mt-1 text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
        Perfil
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#7c5c47]">
        Tus datos, tu contraseña y la sesión de este dispositivo.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-[#7c5c47]">Cargando perfil…</p>
      ) : null}

      {error ? (
        <AdminNotice tone="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}

      {perfil ? (
        <div className="mt-8 space-y-5">
          <PerfilForm perfil={perfil} onUpdated={setPerfil} />
          <PasswordForm />
          <SessionSection />
        </div>
      ) : null}
    </section>
  );
}
