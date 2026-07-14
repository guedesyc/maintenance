import { supabase } from "./supabase";
import type { EquipmentCatalogItem } from "@shared/types";

export async function listActiveEquipment(): Promise<EquipmentCatalogItem[]> {
  const { data, error } = await supabase
    .from("equipamentos_catalogo")
    .select("id, nome, nome_normalizado, ativo")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    throw error;
  }

  return data ?? [];
}
