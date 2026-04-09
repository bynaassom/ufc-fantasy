import type { ApiFailure, ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isApiFailure(value: unknown): value is ApiFailure {
  return !!value && typeof value === "object" && "ok" in value && (value as ApiFailure).ok === false;
}

export function getApiErrorMessage(payload: unknown, fallback = "Erro inesperado.") {
  if (isApiFailure(payload)) return payload.error.message;
  if (payload && typeof payload === "object") {
    const legacyError = (payload as { error?: unknown }).error;
    if (typeof legacyError === "string") return legacyError;
    if (legacyError && typeof legacyError === "object" && "message" in legacyError) {
      const message = (legacyError as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
  }
  return fallback;
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | Record<string, unknown> | null;

  if (!response.ok) {
    if (isApiFailure(payload)) {
      throw new ApiClientError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.details,
      );
    }

    throw new ApiClientError(getApiErrorMessage(payload), response.status);
  }

  if (payload && typeof payload === "object" && "ok" in payload) {
    const apiPayload = payload as ApiResponse<T>;
    if (!apiPayload.ok) {
      throw new ApiClientError(
        apiPayload.error.message,
        response.status,
        apiPayload.error.code,
        apiPayload.error.details,
      );
    }
    return apiPayload.data;
  }

  return payload as T;
}
