import type { Envelope } from "./types";
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields: Record<string, string[]> = {},
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function apiEnvelope<T>(
  path: string,
  options: RequestInit = {},
): Promise<Envelope<T>> {
  let response: Response;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "No se pudo conectar con el servicio. Comprueba tu conexión e intenta de nuevo.",
    );
  }
  if (response.status === 204) return { success: true, data: undefined as T };
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError(
      json?.error?.code || "UNKNOWN_ERROR",
      json?.error?.message || "No fue posible completar la solicitud.",
      json?.error?.fields || {},
      response.status,
    );
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/auth/") &&
      !window.location.pathname.startsWith("/auth/")
    )
      window.location.replace("/?session=expired");
    throw error;
  }
  if (!json || !("data" in json))
    throw new ApiError(
      "INVALID_RESPONSE",
      "El servicio devolvió una respuesta inesperada.",
    );
  return json as Envelope<T>;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return (await apiEnvelope<T>(path, options)).data;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ocurrió un error. Intenta de nuevo.";
export function queryString(
  values: Record<string, string | number | boolean | null | undefined>,
): string {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) p.set(k, String(v));
  });
  return p.toString();
}
