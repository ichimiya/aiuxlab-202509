export class ApplicationError extends Error {
  code?: string;
  status?: number;
  cause?: unknown;

  constructor(
    message: string,
    options?: { code?: string; status?: number; cause?: unknown },
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = options?.code;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}
