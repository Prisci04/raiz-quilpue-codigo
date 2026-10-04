export class UsuarioError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UsuarioError";
    this.code = code;
  }
}
