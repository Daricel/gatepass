import type { ErrorRequestHandler, RequestHandler } from "express";
import { z, ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, "not_found", `${what} not found`);
export const forbidden = () => new HttpError(403, "forbidden", "You don't have access to this resource");

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export const idParam = z.coerce.number().int().positive();

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "validation_error", message: "Invalid input", details: z.flattenError(err).fieldErrors },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong" } });
};

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
};
