import { Buffer } from "node:buffer";

// The existing handlers are shared with the former Netlify deployment. This
// compatibility layer gives them the small event/response contract they use.
const globalProcess = globalThis as typeof globalThis & { process?: { env: Record<string, string | undefined> } };
globalProcess.process = {
  env: Object.fromEntries(
    [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "ADMIN_USERNAME",
      "ADMIN_PASSWORD",
      "ADMIN_SESSION_SECRET",
      "NODE_ENV",
    ].map((key) => [key, Deno.env.get(key)]),
  ),
};
(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;

const [
  adminDashboard,
  adminDownloadTemplate,
  adminEquipment,
  adminExport,
  adminGeneratePatrimonios,
  adminImportEquipment,
  adminImportUnits,
  adminListRegistrations,
  adminLogin,
  adminLogout,
  adminSession,
  adminUnits,
  adminUpdateEquipment,
  adminUpdateUnit,
  adminUploadTemplate,
  publicCreateRegistration,
  publicEquipment,
  publicUnits,
] = await Promise.all([
  import("../../../netlify/functions/admin-dashboard.ts"),
  import("../../../netlify/functions/admin-download-template.ts"),
  import("../../../netlify/functions/admin-equipment.ts"),
  import("../../../netlify/functions/admin-export.ts"),
  import("../../../netlify/functions/admin-generate-patrimonios.ts"),
  import("../../../netlify/functions/admin-import-equipment.ts"),
  import("../../../netlify/functions/admin-import-units.ts"),
  import("../../../netlify/functions/admin-list-registrations.ts"),
  import("../../../netlify/functions/admin-login.ts"),
  import("../../../netlify/functions/admin-logout.ts"),
  import("../../../netlify/functions/admin-session.ts"),
  import("../../../netlify/functions/admin-units.ts"),
  import("../../../netlify/functions/admin-update-equipment.ts"),
  import("../../../netlify/functions/admin-update-unit.ts"),
  import("../../../netlify/functions/admin-upload-template.ts"),
  import("../../../netlify/functions/public-create-registration.ts"),
  import("../../../netlify/functions/public-equipment.ts"),
  import("../../../netlify/functions/public-units.ts"),
]);

const handlers: Record<string, (event: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  "/api/admin-dashboard": adminDashboard.handler,
  "/api/admin-download-template": adminDownloadTemplate.handler,
  "/api/admin-equipment": adminEquipment.handler,
  "/api/admin-export": adminExport.handler,
  "/api/admin-generate-patrimonios": adminGeneratePatrimonios.handler,
  "/api/admin-import-equipment": adminImportEquipment.handler,
  "/api/admin-import-units": adminImportUnits.handler,
  "/api/admin-list-registrations": adminListRegistrations.handler,
  "/api/admin-login": adminLogin.handler,
  "/api/admin-logout": adminLogout.handler,
  "/api/admin-session": adminSession.handler,
  "/api/admin-units": adminUnits.handler,
  "/api/admin-update-equipment": adminUpdateEquipment.handler,
  "/api/admin-update-unit": adminUpdateUnit.handler,
  "/api/admin-upload-template": adminUploadTemplate.handler,
  "/api/public-create-registration": publicCreateRegistration.handler,
  "/api/public-equipment": publicEquipment.handler,
  "/api/public-units": publicUnits.handler,
};

function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
  });
  const origin = request.headers.get("origin");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function createEvent(request: Request, url: URL, body: string | null) {
  const headers = Object.fromEntries(request.headers.entries());
  const queryStringParameters = Object.fromEntries(url.searchParams.entries());
  return {
    body,
    headers,
    httpMethod: request.method,
    isBase64Encoded: false,
    path: `/api${url.pathname}`.replace("/api/api", "/api"),
    queryStringParameters,
    multiValueQueryStringParameters: null,
    multiValueHeaders: null,
    rawQuery: url.search.slice(1),
    requestContext: {},
    stageVariables: null,
  };
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const url = new URL(request.url);
  const functionPrefix = "/functions/v1/api";
  const functionPath = url.pathname.startsWith(functionPrefix)
    ? url.pathname.slice(functionPrefix.length)
    : url.pathname;
  const route = functionPath.startsWith("/api/") ? functionPath : `/api${functionPath}`;
  const handler = handlers[route];
  if (!handler) return new Response(JSON.stringify({ error: "Rota de API nao encontrada." }), { status: 404, headers });

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = request.method === "GET" || request.method === "HEAD"
      ? null
      : contentType.includes("application/json")
        ? JSON.stringify(await request.json())
        : await request.text();
    const result = await handler(createEvent(request, url, body));
    const responseHeaders = new Headers(headers);
    for (const [name, value] of Object.entries((result.headers ?? {}) as Record<string, string>)) {
      responseHeaders.set(name, name.toLowerCase() === "set-cookie" ? value.replace(/SameSite=Lax/i, "SameSite=None; Secure") : value);
    }
    const responseBody = result.isBase64Encoded
      ? Uint8Array.from(atob(String(result.body ?? "")), (char) => char.charCodeAt(0))
      : String(result.body ?? "");
    return new Response(responseBody, { status: Number(result.statusCode ?? 200), headers: responseHeaders });
  } catch (error) {
    console.error("Erro na Edge Function API", error);
    return new Response(JSON.stringify({ error: "Ocorreu um erro interno." }), {
      status: 500,
      headers: new Headers({ ...Object.fromEntries(headers), "Content-Type": "application/json" }),
    });
  }
});
