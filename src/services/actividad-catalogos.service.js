import "server-only";

import { CATALOGO_ACTIVIDAD_NOMBRES } from "@/lib/catalogos.mjs";
import { listCatalogos } from "@/services/catalogos.service";

export async function listCatalogosParaActividad() {
  return listCatalogos([...CATALOGO_ACTIVIDAD_NOMBRES, "comuna"]);
}
