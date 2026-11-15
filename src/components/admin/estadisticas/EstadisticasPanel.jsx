"use client";

import {
  AdminBarChart,
  AdminDonutChart,
  AdminLineChart,
} from "@/components/admin/AdminCharts";
import EstimacionesInscripcionesSection from "@/components/admin/estadisticas/EstimacionesInscripcionesSection";
import { CalendarCheck, Ticket, Users } from "lucide-react";

function Kpi({ label, value, hint, icon: Icon }) {
  return (
    <article className="admin-card flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3eee8] text-[#5c4636]">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-[#8a7968]">{label}</p>
        <p className="mt-0.5 text-xl font-medium tracking-tight text-[#2c1810] tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-[12px] text-[#7c5c47]">{hint}</p> : null}
      </div>
    </article>
  );
}

export default function EstadisticasPanel({
  error = "",
  actividadesRealizadas = 0,
  totalConfirmadas = 0,
  topActividades = [],
  mensualConfirmadas = [],
  distribucionEstados = [],
}) {
  if (error) {
    return (
      <section className="admin-page">
        <header>
          <p className="text-[13px] text-[#8d7b6d]">Sistema › Estadísticas</p>
          <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium text-[#2c1810]">
            Estadísticas
          </h1>
        </header>
        <p className="admin-card mt-6 p-5 text-sm text-[#8d3b28]">{error}</p>
      </section>
    );
  }

  return (
    <section className="admin-page space-y-6">
      <header>
        <p className="text-[13px] text-[#8d7b6d]">Sistema › Estadísticas</p>
        <h1 className="mt-2 font-serif text-[clamp(1.45rem,2.2vw,1.8rem)] font-medium tracking-tight text-[#2c1810]">
          Estadísticas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#7c6a5c]">
          Resumen de actividades realizadas e inscripciones. Los números de
          inscripción confirmada son los que cuentan como cupo oficial.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Actividades realizadas"
          value={actividadesRealizadas}
          hint="Con estado finalizada"
          icon={CalendarCheck}
        />
        <Kpi
          label="Inscripciones confirmadas"
          value={totalConfirmadas}
          hint="Cupos oficiales ocupados"
          icon={Ticket}
        />
        <Kpi
          label="Actividades en el ranking"
          value={topActividades.length}
          hint="Con más confirmadas"
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminBarChart
          title="Actividades con más inscripciones confirmadas"
          series={topActividades}
        />
        <AdminLineChart
          title="Inscripciones confirmadas por mes"
          series={mensualConfirmadas}
          color="#1e4536"
        />
      </div>

      <AdminDonutChart
        title="Cómo se distribuyen las inscripciones"
        slices={distribucionEstados}
      />

      <EstimacionesInscripcionesSection />
    </section>
  );
}
