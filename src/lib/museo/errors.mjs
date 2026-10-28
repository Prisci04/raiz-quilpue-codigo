export class MuseoIntegrityError extends Error {
  constructor() {
    super("La operación no está disponible hasta completar la configuración de integridad del Museo.");
    this.name = "MuseoIntegrityError";
    this.status = 503;
    this.code = "MUSEO_INTEGRITY_UNAVAILABLE";
  }
}
