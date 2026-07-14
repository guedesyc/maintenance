import { supabase } from "./supabase";
import type { Unit } from "@shared/types";

export async function listActiveUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from("unidades")
    .select("id, nome, nome_normalizado, ativo")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    throw error;
  }

  return data ?? [];
}
