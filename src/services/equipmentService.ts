import type { EquipmentCatalogItem } from "@shared/types";

export async function listActiveEquipment(): Promise<EquipmentCatalogItem[]> {
  const response = await fetch("/api/public-equipment");
  const body = (await response.json().catch(() => null)) as { rows?: EquipmentCatalogItem[]; error?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Nao foi possivel carregar os equipamentos.");
  }

  return body?.rows ?? [];
}
