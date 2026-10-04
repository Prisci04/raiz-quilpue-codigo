export class MediaError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "MediaError";
    this.status = status;
    this.code = code;
  }
}
