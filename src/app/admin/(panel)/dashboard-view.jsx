import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Landmark,
  Ticket,
} from "lucide-react";
import DownloadReportButton from "@/components/admin/DownloadReportButton";
import {
  AdminBarChart,
  AdminDonutChart,
  AdminLineChart,
} from "@/components/admin/AdminCharts";

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
  publishedContents,
  totalContents,
  publishedActivities,
  totalEnrollments,
  publishedMuseumPieces,
  contentSlices,
  museumSlices,
  enrollmentsByActivity,
  monthlyEnrollments,
}) {
  const activityMax = Math.max(1, ...enrollmentsByActivity.map((item) => item.value));
  const monthlyMax = Math.max(1, ...monthlyEnrollments.map((item) => item.value));
  const monthlyTicks = [
    ...new Set([
      0,
      Math.ceil(monthlyMax / 4),
      Math.ceil(monthlyMax / 2),
      Math.ceil((monthlyMax * 3) / 4),
      monthlyMax,
    ]),
  ];

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
        <DownloadReportButton
          dateLabel={dateLabel}
          publishedContents={publishedContents}
          totalContents={totalContents}
          publishedActivities={publishedActivities}
          totalEnrollments={totalEnrollments}
          publishedMuseumPieces={publishedMuseumPieces}
          contentSlices={contentSlices}
          museumSlices={museumSlices}
          enrollmentsByActivity={enrollmentsByActivity}
          monthlyEnrollments={monthlyEnrollments}
        />
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          value={publishedContents}
          label="Contenidos publicados"
          hint={`De ${totalContents} contenidos`}
          tone="gold"
          icon={FileText}
        />
        <KpiCard
          value={publishedActivities}
          label="Actividades publicadas"
          hint="Visibles en el sitio"
          tone="brown"
          icon={CalendarDays}
        />
        <KpiCard
          value={totalEnrollments}
          label="Inscripciones"
          hint="Total histórico"
          tone="terracotta"
          icon={Ticket}
        />
        <KpiCard
          value={publishedMuseumPieces}
          label="Piezas del museo"
          hint="Publicadas"
          tone="forest"
          icon={Landmark}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminBarChart
          title="Inscritos por actividad"
          series={enrollmentsByActivity}
          max={activityMax}
        />
        <AdminLineChart
          title="Inscripciones por mes"
          series={monthlyEnrollments}
          color="#c4a04a"
          max={monthlyMax}
          yTicks={monthlyTicks}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminDonutChart title="Contenidos por categoría" slices={contentSlices} />
        <AdminDonutChart title="Piezas del museo por categoría" slices={museumSlices} />
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
