const STATUS_BY_CODE = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export class PaginaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PaginaError";
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 400;
  }
}

export const validation = (message) => new PaginaError("VALIDATION", message);
export const notFound = (message) => new PaginaError("NOT_FOUND", message);
