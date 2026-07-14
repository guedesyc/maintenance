import type { HandlerResponse } from "@netlify/functions";

export function json(statusCode: number, body: unknown, headers: Record<string, string> = {}): HandlerResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown, headers?: Record<string, string>) {
  return json(200, body, headers);
}

export function badRequest(message: string) {
  return json(400, { error: message });
}

export function unauthorized(message = "Nao autorizado.") {
  return json(401, { error: message });
}

export function serverError(message = "Ocorreu um erro interno.") {
  return json(500, { error: message });
}
