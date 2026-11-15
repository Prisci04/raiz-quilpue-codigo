"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = {
  stroke: "#7c5c47",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const GRID = {
  stroke: "rgba(44,24,16,0.08)",
  vertical: false,
};

const TOOLTIP_STYLE = {
  background: "#fffdf9",
  border: "1px solid #efe6dc",
  borderRadius: 8,
  fontSize: 12,
  color: "#2c1810",
};

function ChartFrame({ title, highlight, children }) {
  return (
    <article className="admin-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-medium tracking-tight text-[#2c1810]">{title}</h2>
        {highlight ? (
          <span className="rounded-md bg-[#2c1810]/5 px-2.5 py-1 text-[11px] font-medium text-[#7c5c47]">
            {highlight}
          </span>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <p className="flex h-44 items-center justify-center text-sm text-[#7c5c47] sm:h-52">
      {message}
    </p>
  );
}

export function AdminLineChart({ title, series, color = "#c4a04a", highlight }) {
  const data = (series ?? []).map((item) => ({
    name: item.label,
    value: Number(item.value) || 0,
  }));

  return (
    <ChartFrame title={title} highlight={highlight}>
      {data.length ? (
        <div className="h-44 w-full sm:h-52" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`area-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis allowDecimals={false} width={36} {...AXIS} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [value, "Inscripciones"]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#area-${title.replace(/\s+/g, "-")})`}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="Aún no hay datos para este gráfico." />
      )}
    </ChartFrame>
  );
}

export function AdminBarChart({ title, series, highlight }) {
  const data = (series ?? []).map((item) => ({
    name: item.label,
    value: Number(item.value) || 0,
  }));

  return (
    <ChartFrame title={title} highlight={highlight}>
      {data.length ? (
        <div className="h-44 w-full sm:h-52" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="name"
                {...AXIS}
                interval={0}
                angle={data.length > 4 ? -20 : 0}
                textAnchor={data.length > 4 ? "end" : "middle"}
                height={data.length > 4 ? 48 : 30}
                tickFormatter={(value) =>
                  String(value).length > 14 ? `${String(value).slice(0, 13)}…` : value
                }
              />
              <YAxis allowDecimals={false} width={36} {...AXIS} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [value, "Inscritos"]}
              />
              <Bar dataKey="value" fill="#2c1810" radius={[8, 8, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="Aún no hay actividades con datos para mostrar." />
      )}
    </ChartFrame>
  );
}

export function AdminDonutChart({ title, slices }) {
  const data = (slices ?? [])
    .map((slice) => ({
      id: slice.id,
      name: slice.label,
      value: Number(slice.value) || 0,
      color: slice.color,
    }))
    .filter((slice) => slice.value > 0);

  const total = (slices ?? []).reduce((sum, slice) => sum + (Number(slice.value) || 0), 0);

  return (
    <ChartFrame title={title}>
      {(slices ?? []).length ? (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.length ? data : [{ name: "Sin datos", value: 1, color: "rgba(44,24,16,0.08)" }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {(data.length ? data : [{ color: "rgba(44,24,16,0.08)" }]).map((entry, index) => (
                    <Cell key={entry.id ?? entry.name ?? index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-medium tracking-tight text-[#2c1810]">{total}</span>
              <span className="text-[11px] text-[#7c5c47]">total</span>
            </div>
          </div>
          <ul className="grid flex-1 grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
            {(slices ?? []).map((slice) => (
              <li key={slice.id} className="flex items-center gap-2.5 text-[#2c1810]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                <span className="text-[#7c5c47]">{slice.label}</span>
                <span className="ml-auto font-medium tabular-nums">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState message="Aún no hay datos para este gráfico." />
      )}
    </ChartFrame>
  );
}
