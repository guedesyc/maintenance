import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

import { handler as adminDashboard } from "./netlify/functions/admin-dashboard";
import { handler as adminDownloadTemplate } from "./netlify/functions/admin-download-template";
import { handler as adminEquipment } from "./netlify/functions/admin-equipment";
import { handler as adminExport } from "./netlify/functions/admin-export";
import { handler as adminGeneratePatrimonios } from "./netlify/functions/admin-generate-patrimonios";
import { handler as adminImportEquipment } from "./netlify/functions/admin-import-equipment";
import { handler as adminImportUnits } from "./netlify/functions/admin-import-units";
import { handler as adminListRegistrations } from "./netlify/functions/admin-list-registrations";
import { handler as adminLogin } from "./netlify/functions/admin-login";
import { handler as adminLogout } from "./netlify/functions/admin-logout";
import { handler as adminSession } from "./netlify/functions/admin-session";
import { handler as adminUnits } from "./netlify/functions/admin-units";
import { handler as adminUpdateEquipment } from "./netlify/functions/admin-update-equipment";
import { handler as adminUpdateUnit } from "./netlify/functions/admin-update-unit";
import { handler as adminUploadTemplate } from "./netlify/functions/admin-upload-template";
import { handler as publicCreateRegistration } from "./netlify/functions/public-create-registration";
import { handler as publicEquipment } from "./netlify/functions/public-equipment";
import { handler as publicUnits } from "./netlify/functions/public-units";

type RouteHandler = (event: HandlerEvent) => Promise<HandlerResponse> | HandlerResponse;

const routes: Record<string, RouteHandler> = {
  "/api/admin-dashboard": adminDashboard,
  "/api/admin-download-template": adminDownloadTemplate,
  "/api/admin-equipment": adminEquipment,
  "/api/admin-export": adminExport,
  "/api/admin-generate-patrimonios": adminGeneratePatrimonios,
  "/api/admin-import-equipment": adminImportEquipment,
  "/api/admin-import-units": adminImportUnits,
  "/api/admin-list-registrations": adminListRegistrations,
  "/api/admin-login": adminLogin,
  "/api/admin-logout": adminLogout,
  "/api/admin-session": adminSession,
  "/api/admin-units": adminUnits,
  "/api/admin-update-equipment": adminUpdateEquipment,
  "/api/admin-update-unit": adminUpdateUnit,
  "/api/admin-upload-template": adminUploadTemplate,
  "/api/public-create-registration": publicCreateRegistration,
  "/api/public-equipment": publicEquipment,
  "/api/public-units": publicUnits,
};

function createHandlerEvent(request: Request): HandlerEvent {
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
  );
  const queryStringParameters = Object.fromEntries(
    Object.entries(request.query).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]),
  );

  return {
    body: request.body === undefined ? null : JSON.stringify(request.body),
    headers,
    httpMethod: request.method,
    isBase64Encoded: false,
    path: request.path,
    queryStringParameters,
    multiValueQueryStringParameters: null,
    multiValueHeaders: null,
    rawQuery: request.originalUrl.split("?")[1] ?? "",
    requestContext: {} as HandlerEvent["requestContext"],
    stageVariables: null,
  };
}

function sendHandlerResponse(response: Response, result: HandlerResponse) {
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }

  if (result.isBase64Encoded) {
    response.status(result.statusCode).send(Buffer.from(result.body ?? "", "base64"));
    return;
  }

  response.status(result.statusCode).send(result.body ?? "");
}

const app = express();
const port = Number(process.env.PORT ?? 3000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.all("/api/*splat", async (request, response) => {
  const route = routes[request.path];
  if (!route) {
    response.status(404).json({ error: "Rota de API nao encontrada." });
    return;
  }

  try {
    const result = await route(createHandlerEvent(request));
    sendHandlerResponse(response, result);
  } catch (error) {
    console.error("Erro na rota", request.path, error);
    response.status(500).json({ error: "Ocorreu um erro interno." });
  }
});

app.use(express.static(path.join(currentDirectory, "dist")));
app.get("*splat", (_request, response) => {
  response.sendFile(path.join(currentDirectory, "dist", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
