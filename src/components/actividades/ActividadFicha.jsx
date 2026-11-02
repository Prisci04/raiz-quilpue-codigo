import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Users, Wallet } from "lucide-react";
import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";
import {
  esParticipacionInscripcion,
  labelCosto,
  labelModalidad,
  labelParticipacion,
  labelPublicoObjetivo,
} from "@/lib/actividades";

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

function Dato({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-t border-[#bb9c82]/70 py-3">
      <Icon size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#db700f]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.14em] text-[#946541] uppercase">{label}</p>
        <p className="mt-0.5 text-sm leading-normal text-[#5c331c]">{value}</p>
      </div>
    </div>
  );
}

export default function ActividadFicha({ activity, backHref, backLabel, children }) {
  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  const finalizada = Boolean(activity.pasada);
  const modalidad = activity.modalidad ? labelModalidad(activity.modalidad) : "Modalidad pendiente";
  const participacion = labelParticipacion(activity.tipo_participacion);
  const fecha = formatLongDate(activity.fecha);
  const hora = formatHorario(activity.hora_inicio, activity.hora_fin);
  const lugar = activity.lugar || "Lugar pendiente";
  const valor = labelCosto(activity.costo, activity.valor_monto);
  const cuposLabel = cupos === null
    ? esParticipacionInscripcion(activity.tipo_participacion)
      ? "Inscripción abierta"
      : "Por confirmar"
    : `${cupos} ${cupos === 1 ? "cupo" : "cupos"}`;

  return (
    <article className="mx-auto max-w-3xl px-6 pt-8 pb-16 sm:pt-10">
      {backHref ? (
        <Link
          href={backHref}
          className="site-back-link inline-flex items-center gap-2 border bg-[#f4ece4] text-[#704a31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#db700f]"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          {backLabel || "Volver"}
        </Link>
      ) : null}

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
          <span className="font-mono text-[11px] text-[#946541]">{finalizada ? "Finalizada" : participacion}</span>
        </div>

        <h1 className="mt-4 text-[#5c331c]">
          {activity.titulo}
        </h1>

        <div className="mt-5 h-px w-16 bg-[#c4a04a]" />

        {activity.descripcion ? (
          <p className="mt-6 text-[15px] leading-normal text-[#5c4638] sm:text-base">
            {activity.descripcion}
          </p>
        ) : null}

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2">
          <Dato icon={Calendar} label="Fecha" value={fecha} />
          <Dato icon={Clock} label="Hora" value={hora} />
          <Dato icon={MapPin} label="Lugar" value={lugar} />
          <Dato icon={Ticket} label="Cupos" value={cuposLabel} />
          <Dato icon={Users} label="Público" value={labelPublicoObjetivo(activity.publico_objetivo)} />
          <Dato icon={Wallet} label="Valor" value={valor} />
        </dl>

        {activity.forma_pago ? (
          <p className="mt-4 text-sm leading-normal text-[#704a31]">
            Forma de pago: {activity.forma_pago}
          </p>
        ) : null}

        {activity.informacion_adicional ? (
          <ContenidoDocumento documento={activity.informacion_adicional} />
        ) : null}
      </div>

      {children}
    </article>
  );
}
