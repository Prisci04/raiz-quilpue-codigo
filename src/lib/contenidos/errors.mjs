export class ContenidoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContenidoError";
    this.code = code;
  }
}
