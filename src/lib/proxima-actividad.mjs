function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getProximaActividad(activities, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const read = (type) => parts.find((part) => part.type === type).value;
  const today = `${read("year")}-${read("month")}-${read("day")}`;
  const clock = `${read("hour")}:${read("minute")}:${read("second")}`;
  let next = null;
  let nextKey = "";

  for (const activity of activities) {
    if (!validDate(activity.fecha) || activity.fecha < today) continue;
    const rawTime = activity.hora_inicio;
    if (rawTime && (typeof rawTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(rawTime))) continue;
    const time = rawTime ? rawTime.length === 5 ? `${rawTime}:00` : rawTime : null;
    // Sin hora, una actividad de hoy sigue siendo candidata durante todo el día.
    if (activity.fecha === today && time && time < clock) continue;
    const key = `${activity.fecha}T${time ?? "00:00:00"}`;
    if (!next || key < nextKey) {
      next = activity;
      nextKey = key;
    }
  }
  return next;
}
