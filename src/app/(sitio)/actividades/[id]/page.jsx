import { notFound } from "next/navigation";
import { getActividadById } from "@/services/actividades.service";
import ActividadView from "./actividad-view";

export default async function ActividadPage({ params }) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId < 1) {
    notFound();
  }

  let activity = null;

  try {
    activity = await getActividadById(numericId);
  } catch {
    throw new Error("No fue posible cargar la actividad.");
  }

  if (!activity) {
    notFound();
  }

  return <ActividadView activity={activity} />;
}
