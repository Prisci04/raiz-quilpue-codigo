import OpenStreetMapMap from "@/components/maps/OpenStreetMapMap";
import { actividadTieneUbicacionFisica, buildActividadMapsLinks, puedeMostrarMapa } from "@/lib/actividad-ubicacion.mjs";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Globe,
  ImageIcon,
  MapPin,
  Pencil,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import AdminBadge from "@/components/admin/AdminBadge";
import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";
import {
  esEstadoPublicada,
  esParticipacionInscripcion,
  labelCosto,
  labelModalidad,
  labelParticipacion,
  labelPublicoObjetivo,
} from "@/lib/actividades";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function Status({ value, pasada }) {
  if (pasada && esEstadoPublicada(value)) {
    return <AdminBadge tone="neutral">Finalizada</AdminBadge>;
  }
  const published = esEstadoPublicada(value);
  return <AdminBadge tone={published ? "success" : "warning"}>{published ? "Publicada" : "Borrador"}</AdminBadge>;
}

function dateLabel(value) {
  if (!value) return "Fecha pendiente";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "Fecha pendiente";
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

function clock(value) {
  return value ? String(value).slice(0, 5) : "";
}

function horarioLabel(inicio, fin) {
  const from = clock(inicio);
  const to = clock(fin);
  if (from && to) return `${from} – ${to}`;
  if (from) return from;
  return "Horario pendiente";
}

function cuposLabel(activity) {
  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  const disponibles = Number.isInteger(activity.cupos_disponibles)
    ? activity.cupos_disponibles
    : cupos;
  const espera = Number.isInteger(activity.lista_espera_disponibles)
    ? activity.lista_espera_disponibles
    : null;
  const esperaMax = Number.isInteger(activity.cupos_espera) ? activity.cupos_espera : 0;

  if (esParticipacionInscripcion(activity.tipo_participacion)) {
    if (cupos === null) return "Inscripción abierta";
    if (disponibles > 0) return `${disponibles} de ${cupos} disponibles`;
    if (espera > 0) return `Lista de espera · ${espera} de ${esperaMax}`;
    return "Cupos y lista de espera completos";
  }

  if (cupos === null) return "Por confirmar";
  return `${cupos} cupos`;
}

function Dato({ icon: Icon, label, value }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
          <Icon size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] leading-4 text-[#8a7968]">{label}</p>
          <p className="text-sm leading-5 font-medium wrap-anywhere text-[#2c1810]">{value}</p>
        </div>
      </div>
    </article>
  );
}

export default function ActividadDetallePanel({ activity }) {
  const fecha = dateLabel(activity.fecha);
  const horario = horarioLabel(activity.hora_inicio, activity.hora_fin);
  const lugar = activity.lugar || "Lugar pendiente";
  const physical = actividadTieneUbicacionFisica(activity);
  const links = buildActividadMapsLinks(activity);

  return (
    <section className="admin-page">
      <p className="text-[13px] text-[#8d7b6d]">
        <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        <Link href="/admin/actividades" className="hover:text-[#2c1810]">Actividades</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        {activity.titulo}
      </p>

      <Link
        href="/admin/actividades"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#eadfd4] bg-white px-3.5 text-sm text-[#5c4636] hover:bg-[#faf6f1]"
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Volver a actividades
      </Link>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl bg-[#eee4da] sm:h-64 lg:h-auto lg:min-h-[16rem] lg:w-[22rem]">
          {activity.imagen_url ? (
            <Image
              src={activity.imagen_url}
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 352px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#b7a394]">
              <ImageIcon size={36} strokeWidth={1.6} aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-[#c45c38] uppercase">
              Actividad
            </p>
            <Status value={activity.estado} pasada={activity.pasada} />
          </div>
          <h1 className="mt-1 max-w-3xl font-serif text-[clamp(1.5rem,2.4vw,1.95rem)] leading-tight font-medium tracking-tight text-[#2c1810]">
            {activity.titulo}
          </h1>
          {activity.descripcion ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c4d42] sm:text-[15px]">
              {activity.descripcion}
            </p>
          ) : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#8d7b6d]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
              {fecha}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
              {horario}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} strokeWidth={1.8} aria-hidden="true" />
              {lugar}
            </span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:pt-5">
            <Link
              href={`/admin/actividades/${activity.id}/participantes`}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#1e4536] px-4 text-sm font-medium text-white hover:bg-[#16352a]"
            >
              <Users size={16} strokeWidth={1.8} aria-hidden="true" />
              Ver participantes
            </Link>
            <Link
              href={`/admin/actividades/${activity.id}/editar`}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-[#e6ddd4] bg-white px-4 text-sm font-medium text-[#2c1810] hover:bg-[#faf6f1]"
            >
              <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
              Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Dato icon={CalendarDays} label="Fecha" value={fecha} />
        <Dato icon={Clock3} label="Hora" value={horario} />
        <Dato icon={MapPin} label="Lugar" value={lugar} />
        {physical && activity.direccion ? <Dato icon={MapPin} label="Dirección" value={activity.direccion} /> : null}
        <Dato icon={MapPin} label="Ubicación" value={!physical ? "Sin uso en modalidad virtual" : puedeMostrarMapa(activity) ? "Coordenadas guardadas" : "Sin coordenadas"} />
        <Dato icon={Users} label="Público" value={labelPublicoObjetivo(activity.publico_objetivo)} />
        <Dato icon={Wallet} label="Valor" value={labelCosto(activity.costo, activity.valor_monto)} />
        <Dato icon={Ticket} label="Cupos" value={cuposLabel(activity)} />
        <Dato icon={Globe} label="Modalidad" value={labelModalidad(activity.modalidad)} />
        <Dato
          icon={Users}
          label="Participación"
          value={labelParticipacion(activity.tipo_participacion, { corta: true })}
        />
      </div>

      {physical ? <div className="admin-card mt-5 space-y-3 p-4">
        <h2 className="font-serif text-lg font-medium text-[#2c1810]">Ubicación del evento</h2>
        {puedeMostrarMapa(activity) ? <OpenStreetMapMap latitud={activity.latitud} longitud={activity.longitud} /> : null}
        <div className="flex flex-wrap gap-4 text-sm text-[#704a31]">
          {links.directions ? <a href={links.directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Cómo llegar</a> : null}
          {links.map ? <a href={links.map} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Abrir en Google Maps</a> : null}
        </div>
        {links.map ? <p className="text-xs leading-relaxed text-[#7c5c47]">Cómo llegar abre las indicaciones de ruta; Abrir en Google Maps muestra el punto. Se abren en otra pestaña.</p> : null}
      </div> : null}

      {activity.informacion_adicional ? (
        <div className="mt-6 rounded-2xl border border-[#efe6dc] bg-white p-5 sm:p-6">
          <h2 className="font-serif text-lg font-medium text-[#2c1810]">
            Información adicional
          </h2>
          <div className="-mt-4">
            <ContenidoDocumento documento={activity.informacion_adicional} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
