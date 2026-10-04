"use client";

import { useId, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { generatePassword } from "@/lib/usuarios/generate-password.mjs";
import { passwordChecks } from "@/lib/usuarios/validation.mjs";

export default function PasswordField({ value, onChange, error }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  function handleGenerate() {
    onChange(generatePassword());
    setVisible(true);
  }

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-[#2c1810]">
        Contraseña *
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-md border border-[#bb9c82]/80 bg-white py-2.5 pr-11 pl-3 text-sm text-[#2c1810] outline-none transition-colors focus:border-[#704a31]"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#7c5c47] hover:text-[#2c1810]"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? (
              <EyeOff size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Eye size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-[#bb9c82]/80 px-4 text-[12px] font-medium tracking-[0.06em] text-[#2c1810] uppercase transition-colors hover:bg-[#f7f1ea]"
        >
          Generar contraseña
        </button>
      </div>
      <ul className="mt-2 space-y-1" aria-label="Requisitos de la contraseña">
        {passwordChecks(value).map((check) => (
          <li
            key={check.id}
            className={`flex items-center gap-2 text-[12px] leading-none transition-colors ${
              check.met ? "text-[#2d7a46]" : "text-[#7c5c47]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                check.met
                  ? "border-[#2d7a46] bg-[#2d7a46] text-white"
                  : "border-[#bb9c82] bg-white"
              }`}
            >
              {check.met ? <Check size={10} strokeWidth={3} /> : null}
            </span>
            <span className="sr-only">{check.met ? "Cumplido: " : "Pendiente: "}</span>
            {check.label}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-1 text-[12px] text-[#8d3b28]">{error}</p> : null}
    </div>
  );
}
