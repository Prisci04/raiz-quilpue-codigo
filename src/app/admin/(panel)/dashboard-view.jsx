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
import {
  AdminBarChart,
  AdminDonutChart,
  AdminLineChart,
} from "@/components/admin/AdminCharts";
import {
  ENROLLMENTS_BY_ACTIVITY,
  REACTIONS_BY_MONTH,
  VISITS_BY_MONTH,
} from "@/lib/admin-dashboard";

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

export default function AdminDashboardView({
  dateLabel,
  uniqueVisitors,
  enrollments,
  publishedContents,
  totalContents,
  museumReactions,
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
          value={uniqueVisitors}
          label="Visitantes únicos"
          hint="Septiembre 2026"
          tone="gold"
          icon={Eye}
        />
        <KpiCard
          value={enrollments}
          label="Inscritos actividades"
          hint="Total histórico"
          tone="brown"
          icon={Ticket}
        />
        <KpiCard
          value={publishedContents}
          label="Contenidos publicados"
          hint={`De ${totalContents} totales`}
          tone="forest"
          icon={FileText}
        />
        <KpiCard
          value={museumReactions}
          label="Reacciones museo"
          hint="Me interesa"
          tone="terracotta"
          icon={Heart}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminLineChart
          title="Visitas por mes"
          series={VISITS_BY_MONTH}
          color="#c4a04a"
          max={1200}
          yTicks={[300, 600, 900, 1200]}
          highlight="1.020 este mes"
        />
        <AdminBarChart
          title="Inscritos por actividad"
          series={ENROLLMENTS_BY_ACTIVITY}
          max={100}
          highlight="Actual"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminDonutChart title="Contenidos por categoría" slices={contentSlices} />
        <AdminLineChart
          title="Reacciones museo por mes"
          series={REACTIONS_BY_MONTH}
          color="#c45a3a"
          max={320}
          yTicks={[80, 160, 240, 320]}
        />
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
