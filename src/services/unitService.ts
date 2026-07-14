import type { Unit } from "@shared/types";

export async function listActiveUnits(): Promise<Unit[]> {
  const response = await fetch("/api/public-units");
  const body = (await response.json().catch(() => null)) as { rows?: Unit[]; error?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Nao foi possivel carregar as unidades.");
  }

  return body?.rows ?? [];
}
