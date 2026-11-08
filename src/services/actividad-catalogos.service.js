import "server-only";

import { listCatalogosActividad } from "@/services/catalogos.service";
import { listLugares } from "@/services/lugares.service";

export async function listCatalogosParaActividad() {
  const [catalogos, lugares] = await Promise.all([
    listCatalogosActividad(),
    listLugares(),
  ]);

  return {
    ...catalogos,
    lugares: lugares.map((lugar) => ({ id: lugar.id, nombre: lugar.nombre })),
  };
}
