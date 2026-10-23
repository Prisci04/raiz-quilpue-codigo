import Link from "next/link";
import {
  CalendarDays,
  Eye,
  FileText,
  Heart,
  Landmark,
  Ticket,
} from "lucide-react";
import DownloadReportButton from "@/components/admin/DownloadReportButton";
import { AdminDonutChart } from "@/components/admin/AdminCharts";

const KPI_TONES = {
  gold: { icon: "bg-[#feca2b]/20 text-[#9a7a12]", value: "text-[#9a7a12]" },
  brown: { icon: "bg-[#2c1810]/8 text-[#704a31]", value: "text-[#704a31]" },
  forest: { icon: "bg-[#687a42]/15 text-[#4f5e32]", value: "text-[#4f5e32]" },
  terracotta: { icon: "bg-[#c45a3a]/12 text-[#b14a2e]", value: "text-[#b14a2e]" },
};

function KpiCard({ value, label, hint, tone, icon: Icon }) {
  const colors = KPI_TONES[tone];

  return (
    <article className="admin-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[1.85rem] leading-none font-semibold tracking-tight ${colors.value}`}>
          {value}
        </p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-sm ${colors.icon}`}>
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-[#2c1810]">{label}</p>
      <p className="mt-0.5 text-[12px] text-[#7c5c47]">{hint}</p>
    </article>
  );
}

const QUICK_ACTIONS = [
  {
    href: "/admin/contenidos/nuevo",
    label: "Nuevo contenido",
    hint: "Publicar noticia o pieza",
    icon: FileText,
  },
  {
    href: "/admin/actividades/nueva",
    label: "Nueva actividad",
    hint: "Abrir inscripciones",
    icon: CalendarDays,
  },
  {
    href: "/admin/museo/nueva",
    label: "Nueva pieza",
    hint: "Sumar al museo digital",
    icon: Landmark,
  },
];

function PendingChart({ title }) {
  return (
    <article className="admin-card p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold tracking-tight text-[#2c1810]">{title}</h2>
      <p className="mt-4 flex min-h-44 items-center text-sm text-[#7c5c47]">
        Sin datos disponibles. Esta métrica todavía no tiene una fuente conectada.
      </p>
    </article>
  );
}

export default function AdminDashboardView({
  dateLabel,
  publishedContents,
  contentError,
  contentSlices,
}) {
  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-[#7c5c47] uppercase">
            Panel principal
          </p>
          <h1 className="mt-1 text-[clamp(1.7rem,3vw,2.05rem)] font-semibold tracking-tight text-[#2c1810]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#7c5c47]">{dateLabel}</p>
        </div>
        <DownloadReportButton />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          value="—"
          label="Visitantes únicos"
          hint="Sin fuente de datos conectada"
          tone="gold"
          icon={Eye}
        />
        <KpiCard
          value="—"
          label="Inscritos actividades"
          hint="Sin fuente de datos conectada"
          tone="brown"
          icon={Ticket}
        />
        <KpiCard
          value={publishedContents ?? "—"}
          label="Contenidos publicados"
          hint={contentError ? "Error al cargar" : "Total de publicaciones"}
          tone="forest"
          icon={FileText}
        />
        <KpiCard
          value="—"
          label="Reacciones museo"
          hint="Sin fuente de datos conectada"
          tone="terracotta"
          icon={Heart}
        />
      </section>

      {contentError ? <p role="alert" className="text-sm text-[#8d3b28]">{contentError}</p> : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PendingChart title="Visitas por mes" />
        <PendingChart title="Inscritos por actividad" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {contentSlices.length ? (
          <AdminDonutChart title="Publicaciones cargadas por categoría" slices={contentSlices} />
        ) : (
          <article className="admin-card p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-[#2c1810]">Publicaciones cargadas por categoría</h2>
            <p className="mt-4 flex min-h-44 items-center text-sm text-[#7c5c47]">
              {contentError ? "No se pudo cargar la distribución." : "Aún no hay contenidos publicados."}
            </p>
          </article>
        )}
        <PendingChart title="Reacciones museo por mes" />
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-[#2c1810]">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="admin-card group flex min-h-[5.25rem] items-center gap-3.5 px-4 transition-transform hover:-translate-y-0.5"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#2c1810]/6 text-[#2c1810] transition-colors group-hover:bg-[#feca2b]">
                  <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#2c1810]">{action.label}</span>
                  <span className="mt-0.5 block text-[12px] text-[#7c5c47]">{action.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
