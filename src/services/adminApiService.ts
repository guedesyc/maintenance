import type {
  AdminSessionResponse,
  DashboardSummary,
  ExportTemplateMetadata,
  ImportSummary,
  RegistrationListRow,
} from "@shared/types";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        "As funcoes administrativas nao estao ativas neste servidor local. Use netlify dev para acessar o painel ADM.",
      );
    }
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Falha na requisicao.");
  }
  return (await response.json()) as T;
}

export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  return handleResponse<T>(response);
}

export function loginAdmin(username: string, password: string) {
  return adminFetch<{ authenticated: true }>("/api/admin-login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutAdmin() {
  return adminFetch<{ success: true }>("/api/admin-logout", {
    method: "POST",
  });
}

export function getAdminSession() {
  return adminFetch<AdminSessionResponse>("/api/admin-session");
}

export function getDashboardSummary() {
  return adminFetch<DashboardSummary>("/api/admin-dashboard");
}

export function getRegistrations(params: URLSearchParams) {
  return adminFetch<{
    rows: RegistrationListRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/admin-list-registrations?${params.toString()}`);
}

export function importUnits(payload: { fileName: string; fileBase64: string; mode: "ADD" | "REPLACE" }) {
  return adminFetch<ImportSummary>("/api/admin-import-units", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importEquipment(payload: { fileName: string; fileBase64: string; mode: "ADD" | "REPLACE" }) {
  return adminFetch<ImportSummary>("/api/admin-import-equipment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadTemplate(payload: { fileName: string; fileBase64: string }) {
  return adminFetch<ExportTemplateMetadata>("/api/admin-upload-template", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function downloadTemplate() {
  const response = await fetch("/api/admin-download-template", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel baixar o modelo atual.");
  }

  return {
    filename: response.headers.get("x-export-filename") ?? "modelo-exportacao.xlsx",
    blob: await response.blob(),
  };
}

export async function exportRegistrations(params: URLSearchParams) {
  const response = await fetch(`/api/admin-export?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Nao foi possivel exportar.");
  }
  return {
    filename: response.headers.get("x-export-filename") ?? "equipamentos-importacao.xlsx",
    blob: await response.blob(),
  };
}
