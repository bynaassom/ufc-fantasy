import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

export class ApiRouteError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiFailure(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status },
  );
}

export function apiErrorFromUnknown(error: unknown) {
  if (error instanceof ApiRouteError) {
    return apiFailure(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return apiFailure(400, "VALIDATION_ERROR", "Payload inválido.", error.flatten());
  }

  if (error && typeof error === "object" && "statusCode" in error) {
    const status = Number((error as Record<string, unknown>).statusCode) || 500;
    const message = (error as { message?: string }).message || "Erro inesperado.";
    return apiFailure(status, "ERROR", message);
  }

  console.error(error);
  return apiFailure(500, "INTERNAL_ERROR", "Erro interno do servidor.");
}

export async function parseJsonBody<T>(request: NextRequest, schema: ZodType<T>) {
  const payload = await request.json().catch(() => {
    throw new ApiRouteError(400, "INVALID_JSON", "JSON inválido.");
  });

  return schema.parse(payload);
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

export function assertSameOriginForMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!host) return;

  const proto =
    request.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  const allowedOrigins = new Set<string>([
    normalizeOrigin(`${proto}://${host}`),
  ]);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.add(normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL));
  }

  if (!allowedOrigins.has(normalizeOrigin(origin))) {
    throw new ApiRouteError(403, "INVALID_ORIGIN", "Origem da requisição não permitida.");
  }
}
