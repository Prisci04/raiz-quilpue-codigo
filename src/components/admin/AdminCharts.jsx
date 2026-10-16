function polyline(values, max, width, height, pad) {
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  return values.map((value, index) => {
    const x =
      values.length === 1
        ? pad.left + innerW / 2
        : pad.left + (index / (values.length - 1)) * innerW;
    const y = pad.top + innerH - (value / max) * innerH;
    return { x, y };
  });
}

function toLine(points) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function toArea(points, baseline) {
  if (!points.length) return "";
  const line = toLine(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function ChartFrame({ title, highlight, children }) {
  return (
    <article className="admin-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#2c1810]">{title}</h2>
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

export function AdminLineChart({ title, series, color, max, yTicks, highlight }) {
  const width = 560;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 32, left: 40 };
  const baseline = height - pad.bottom;
  const gradientId = `fill-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const points = polyline(
    series.map((item) => item.value),
    max,
    width,
    height,
    pad,
  );

  return (
    <ChartFrame title={title} highlight={highlight}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full sm:h-52" role="img" aria-label={title}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => {
          const y =
            pad.top +
            (height - pad.top - pad.bottom) -
            (tick / max) * (height - pad.top - pad.bottom);
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="rgba(44,24,16,0.08)"
                strokeWidth="1"
              />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#7c5c47" fontSize="10">
                {tick}
              </text>
            </g>
          );
        })}
        <path d={toArea(points, baseline)} fill={`url(#${gradientId})`} />
        <path d={toLine(points)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle
            key={series[index].label}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="#fffdf9"
            stroke={color}
            strokeWidth="2"
          />
        ))}
        {series.map((item, index) => (
          <text
            key={item.label}
            x={points[index].x}
            y={height - 8}
            textAnchor="middle"
            fill="#7c5c47"
            fontSize="10"
          >
            {item.label}
          </text>
        ))}
      </svg>
    </ChartFrame>
  );
}

export function AdminBarChart({ title, series, max, highlight }) {
  const width = 560;
  const height = 220;
  const pad = { top: 12, right: 12, bottom: 42, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const gap = 22;
  const barWidth = Math.max(18, (innerW - gap * (series.length - 1)) / series.length);

  return (
    <ChartFrame title={title} highlight={highlight}>
      {series.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full sm:h-52" role="img" aria-label={title}>
          {[0, max / 4, max / 2, (max * 3) / 4, max].map((tick) => {
            const y = pad.top + innerH - (tick / max) * innerH;
            return (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(44,24,16,0.08)"
                  strokeWidth="1"
                />
                <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#7c5c47" fontSize="10">
                  {tick}
                </text>
              </g>
            );
          })}
          {series.map((item, index) => {
            const barHeight = Math.max((item.value / max) * innerH, item.value > 0 ? 4 : 0);
            const x = pad.left + index * (barWidth + gap);
            const y = pad.top + innerH - barHeight;
            return (
              <g key={item.label}>
                <title>{`${item.label}: ${item.value}`}</title>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx="8" fill="#2c1810" opacity={item.value ? 0.88 : 0.12} />
                <text
                  x={x + barWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#7c5c47"
                  fontSize="9"
                >
                  {item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="flex h-44 items-center justify-center text-sm text-[#7c5c47] sm:h-52">
          Aún no hay actividades publicadas.
        </p>
      )}
    </ChartFrame>
  );
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function AdminDonutChart({ title, slices }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const cx = 92;
  const cy = 92;
  const radius = 58;
  const arcs = slices.reduce((result, slice) => {
    if (total === 0) return result;
    const sweep = (slice.value / total) * 360;
    const startAngle = result.cursor;
    const endAngle = startAngle + Math.max(sweep, 0.8);

    return {
      cursor: result.cursor + sweep,
      arcs: [...result.arcs, { ...slice, startAngle, endAngle }],
    };
  }, { cursor: 0, arcs: [] }).arcs;

  return (
    <ChartFrame title={title}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <svg viewBox="0 0 184 184" className="h-40 w-40" role="img" aria-label={title}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(44,24,16,0.08)" strokeWidth="22" />
            {arcs.map((arc) => (
              <path
                key={arc.id}
                d={describeArc(cx, cy, radius, arc.startAngle, arc.endAngle)}
                fill="none"
                stroke={arc.color}
                strokeWidth="22"
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tracking-tight text-[#2c1810]">{total}</span>
            <span className="text-[11px] text-[#7c5c47]">total</span>
          </div>
        </div>
        <ul className="grid flex-1 grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2.5 text-[#2c1810]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
              <span className="text-[#7c5c47]">{slice.label}</span>
              <span className="ml-auto font-medium tabular-nums">{slice.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
