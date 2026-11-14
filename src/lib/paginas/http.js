import "server-only";

import { revalidatePath } from "next/cache";

import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { MediaError } from "@/lib/media/errors.mjs";
import { PaginaError, validation } from "@/lib/paginas/errors.mjs";
import { RUTAS_PUBLICAS } from "@/lib/paginas/estructura.mjs";

/**
 * Envoltorio de las rutas de Gestión de Páginas: exige sesión de administrador o
 * editor (runAdminCommunity) y convierte errores de dominio en respuestas JSON
 * coherentes. Cualquier otro error se registra y responde 500 genérico.
 */
export function runPaginasAdmin(request, context, operation) {
  return runAdminCommunity(request, context, async (user) => {
    try {
      return await operation(user);
    } catch (error) {
      if (error instanceof PaginaError || error instanceof MediaError) {
        return jsonError(error.status, error.code, error.message);
      }

      throw error;
    }
  });
}

/** Lee el cuerpo JSON o responde 400 de dominio. */
export async function requireJsonBody(request) {
  const body = await readJsonBody(request);

  if (!body) {
    throw validation("El cuerpo de la solicitud no es válido.");
  }

  return body;
}

/** Los cambios deben verse en el sitio público apenas se guardan. */
export function revalidarSitioPublico() {
  for (const ruta of RUTAS_PUBLICAS) {
    revalidatePath(ruta);
  }
}

export function respuestaOk(data, status = 200) {
  revalidarSitioPublico();
  return jsonSuccess(data, {}, status);
}
