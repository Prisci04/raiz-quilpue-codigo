"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Users, Wallet } from "lucide-react";
import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";

const MODALIDAD = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrida: "Híbrida",
};

const TIPO_VALOR = {
  gratuito: "Gratuito",
  pagado: "Pagado",
  voluntario: "Voluntario",
  pendiente: "Pendiente",
};

const PARTICIPACION = {
  abierta: "Participación abierta",
  inscripcion: "Requiere inscripción",
  pendiente: "Participación pendiente",
};

function formatLongDate(dateString) {
  if (!dateString) return "Fecha pendiente";

  const [year, month, day] = String(dateString).split("-").map(Number);
  const date =
    year && month && day ? new Date(year, month - 1, day) : new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Fecha pendiente";

  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatClock(time) {
  if (!time) return "";
  const match = String(time).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : String(time);
}

function formatHorario(inicio, fin) {
  const start = formatClock(inicio);
  const end = formatClock(fin);
  if (start && end) return `${start} a ${end}`;
  return start || end || "Horario pendiente";
}

function formatValor(tipo, monto) {
  const label = TIPO_VALOR[tipo] ?? "Pendiente";
  if (tipo === "pagado" && Number.isInteger(monto)) {
    return `${label} · $${monto.toLocaleString("es-CL")}`;
  }
  return label;
}

function Dato({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-t border-[#bb9c82]/70 py-3">
      <Icon size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#db700f]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.14em] text-[#946541] uppercase">{label}</p>
        <p className="mt-0.5 text-sm leading-6 text-[#5c331c]">{value}</p>
      </div>
    </div>
  );
}

export default function ActividadView({ activity }) {
  const [confirmation, setConfirmation] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });

  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  const hasCupos = cupos === null || cupos > 0;
  const requiereInscripcion = activity.tipo_participacion === "inscripcion";
  const modalidad = MODALIDAD[activity.modalidad] ?? "Modalidad pendiente";
  const participacion = PARTICIPACION[activity.tipo_participacion] ?? "Participación pendiente";
  const fecha = formatLongDate(activity.fecha);
  const hora = formatHorario(activity.hora_inicio, activity.hora_fin);
  const lugar = activity.lugar || "Lugar pendiente";
  const valor = formatValor(activity.tipo_valor, activity.valor_monto);
  const cuposLabel = cupos === null ? "Por confirmar" : `${cupos} cupos`;

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleInscriptionSubmit(event) {
    event.preventDefault();

    if (!hasCupos) {
      setConfirmation("No quedan cupos disponibles para esta actividad.");
      return;
    }

    setConfirmation("¡Inscripción realizada correctamente!");
    setFormData({ nombre: "", apellido: "", email: "", telefono: "" });
  }

  const inputClass =
    "min-h-12 border border-[#bb9c82] bg-[#e7dcd2] px-4 text-[#704a31] outline-none";

  return (
    <main className="bg-[#e7dcd2] pb-16 text-[#704a31]">
      <article className="mx-auto max-w-3xl px-6 pt-8 sm:pt-10">
        <Link
          href="/actividades"
          className="inline-flex h-11 items-center gap-2 border border-[#bb9c82] bg-[#f4ece4] px-4 text-sm text-[#704a31]"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          Volver a actividades
        </Link>

        <div className="relative mt-6 h-64 overflow-hidden bg-[#bb9c82]/35 sm:h-96">
          {activity.imagen_url ? (
            <Image
              src={activity.imagen_url}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center font-mono text-[10px] tracking-wide text-[#946541] uppercase">
              Imagen próximamente
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#704a31] px-2.5 py-1 font-mono text-[10px] tracking-wide text-[#f4ece4] uppercase">
              {modalidad}
            </span>
            <span className="font-mono text-[11px] text-[#946541]">{participacion}</span>
          </div>

          <h1 className="mt-5 font-serif text-4xl leading-tight font-medium text-[#5c331c] sm:text-5xl">
            {activity.titulo}
          </h1>

          <div className="mt-5 h-px w-16 bg-[#c4a04a]" />

          {activity.descripcion ? (
            <p className="mt-6 text-[15px] leading-7 text-[#5c4638] sm:text-base">
              {activity.descripcion}
            </p>
          ) : null}

          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2">
            <Dato icon={Calendar} label="Fecha" value={fecha} />
            <Dato icon={Clock} label="Hora" value={hora} />
            <Dato icon={MapPin} label="Lugar" value={lugar} />
            <Dato icon={Ticket} label="Cupos" value={cuposLabel} />
            <Dato icon={Users} label="Público" value={activity.publico_objetivo || "Por confirmar"} />
            <Dato icon={Wallet} label="Valor" value={valor} />
          </dl>

          {activity.forma_pago ? (
            <p className="mt-4 text-sm leading-7 text-[#704a31]">
              Forma de pago: {activity.forma_pago}
            </p>
          ) : null}

          {activity.informacion_adicional ? (
            <ContenidoDocumento documento={activity.informacion_adicional} />
          ) : null}
        </div>

        {requiereInscripcion ? (
          <form
            onSubmit={handleInscriptionSubmit}
            className="mt-10 border border-[#bb9c82] bg-[#f4ece4] p-5 sm:p-6"
          >
            <h2 className="font-serif text-2xl font-medium text-[#5c331c]">Inscripción</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Nombre
                <input name="nombre" value={formData.nombre} onChange={handleFormChange} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Apellido
                <input name="apellido" value={formData.apellido} onChange={handleFormChange} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Correo electrónico
                <input name="email" type="email" value={formData.email} onChange={handleFormChange} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Teléfono
                <input name="telefono" type="tel" value={formData.telefono} onChange={handleFormChange} required className={inputClass} />
              </label>
            </div>
            <button
              type="submit"
              disabled={!hasCupos}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center bg-[#704a31] px-6 text-[12px] font-semibold tracking-[0.12em] text-[#f4ece4] uppercase disabled:opacity-50 sm:w-auto"
            >
              Inscribirme
            </button>
            {confirmation ? (
              <p className="mt-3 text-sm font-semibold text-[#db700f]">{confirmation}</p>
            ) : null}
          </form>
        ) : null}
      </article>
    </main>
  );
}
