import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Eye,
  FileText,
  ImageIcon,
  Landmark,
  Newspaper,
  Palette,
  Pencil,
  ScrollText,
  Users,
} from "lucide-react";
import AdminBadge from "@/components/admin/AdminBadge";
import ContenidoDocumento from "@/components/contenido/ContenidoDocumento";
import { esEstadoPublicada } from "@/lib/actividades";
import {
  NOMBRE_TIPO_CAPSULA,
  NOMBRE_TIPO_COMUNIDAD,
  NOMBRE_TIPO_CULTURA,
  NOMBRE_TIPO_NOTICIA,
  NOMBRE_TIPO_PATRIMONIO,
} from "@/lib/catalogos.mjs";
import { TIPO_LABELS_ADMIN } from "@/lib/contenidos/documento.mjs";

const TIPO_ICONS = {
  [NOMBRE_TIPO_NOTICIA]: Newspaper,
  [NOMBRE_TIPO_PATRIMONIO]: Landmark,
  [NOMBRE_TIPO_CAPSULA]: ScrollText,
  [NOMBRE_TIPO_CULTURA]: Palette,
  [NOMBRE_TIPO_COMUNIDAD]: Users,
};

function Status({ value }) {
  const published = esEstadoPublicada(value);
  return (
    <AdminBadge tone={published ? "success" : "warning"}>
      {published ? "Publicado" : "Borrador"}
    </AdminBadge>
  );
}

function dateLabel(value) {
  if (!value) return "Fecha pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function hasDocumento(documento) {
  if (!documento || documento.type !== "doc") return false;
  const nodes = Array.isArray(documento.content) ? documento.content : [];
  return nodes.some((node) => {
    if (!node || typeof node !== "object") return false;
    if (node.type === "image") return Boolean(node.attrs?.src);
    if (Array.isArray(node.content) && node.content.length > 0) return true;
    return false;
  });
}

function Dato({ icon: Icon, label, value }) {
  return (
    <article className="rounded-xl border border-[#efe6dc] bg-white px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8ebe6] text-[#c45c38]">
          <Icon size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] leading-4 text-[#8a7968]">{label}</p>
          <p className="text-sm leading-5 font-medium text-[#2c1810]">{value}</p>
        </div>
      </div>
    </article>
  );
}

export default function ContenidoDetallePanel({ contenido }) {
  const fecha = dateLabel(contenido.fecha_publicacion);
  const hora = contenido.hora_texto || "";
  const tipoLabel = TIPO_LABELS_ADMIN[contenido.tipo] ?? contenido.tipo;
  const TipoIcon = TIPO_ICONS[contenido.tipo] ?? FileText;
  const published = esEstadoPublicada(contenido.estado);
  const body = hasDocumento(contenido.contenido);

  return (
    <section className="admin-page">
      <p className="text-[13px] text-[#8d7b6d]">
        <Link href="/admin" className="hover:text-[#2c1810]">Gestión</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        <Link href="/admin/contenidos" className="hover:text-[#2c1810]">Contenidos</Link>
        <span className="px-1.5" aria-hidden="true">›</span>
        {contenido.titulo}
      </p>

      <Link
        href="/admin/contenidos"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#eadfd4] bg-white px-3.5 text-sm text-[#5c4636] hover:bg-[#faf6f1]"
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Volver a contenidos
      </Link>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl bg-[#eee4da] sm:h-64 lg:h-auto lg:min-h-[16rem] lg:w-[22rem]">
          {contenido.imagen_url ? (
            <Image
              src={contenido.imagen_url}
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
              {tipoLabel}
            </p>
            <Status value={contenido.estado} />
          </div>
          <h1 className="mt-1 max-w-3xl font-serif text-[clamp(1.5rem,2.4vw,1.95rem)] leading-tight font-medium tracking-tight text-[#2c1810]">
            {contenido.titulo}
          </h1>
          {contenido.descripcion ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c4d42] sm:text-[15px]">
              {contenido.descripcion}
            </p>
          ) : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#8d7b6d]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
              {fecha}
            </span>
            {hora ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
                {hora}
              </span>
            ) : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:pt-5">
            {published ? (
              <Link
                href={`/contenido/${contenido.id}`}
                target="_blank"
                className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#1e4536] px-4 text-sm font-medium text-white hover:bg-[#16352a]"
              >
                <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
                Ver en el portal
              </Link>
            ) : null}
            <Link
              href={`/admin/contenidos/${contenido.id}/editar`}
              className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-sm font-medium ${
                published
                  ? "border border-[#e6ddd4] bg-white text-[#2c1810] hover:bg-[#faf6f1]"
                  : "bg-[#1e4536] text-white hover:bg-[#16352a]"
              }`}
            >
              <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
              Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Dato icon={TipoIcon} label="Tipo" value={tipoLabel} />
        <Dato icon={FileText} label="Estado" value={published ? "Publicado" : "Borrador"} />
        <Dato icon={CalendarDays} label="Fecha" value={fecha} />
        {hora ? <Dato icon={Clock3} label="Hora" value={hora} /> : null}
      </div>

      {contenido.resumen ? (
        <div className="mt-6 rounded-2xl border border-[#efe6dc] bg-white p-5 sm:p-6">
          <h2 className="font-serif text-lg font-medium text-[#2c1810]">Resumen</h2>
          <p className="mt-2 text-sm leading-7 text-[#5c4d42]">{contenido.resumen}</p>
        </div>
      ) : null}

      {body ? (
        <div className="mt-6 rounded-2xl border border-[#efe6dc] bg-white p-5 sm:p-6">
          <h2 className="font-serif text-lg font-medium text-[#2c1810]">Contenido</h2>
          <div className="-mt-4">
            <ContenidoDocumento documento={contenido.contenido} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
