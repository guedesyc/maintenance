import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistrationListRow, Status } from "../../../shared/types";

interface CadastroRow {
  id: string;
  request_id: string;
  unidade_id: string;
  unidade_nome: string;
  created_at: string;
}

interface PatrimonioRow {
  id: string;
  cadastro_id: string;
  equipamento_id: string;
  equipamento_nome: string;
  numero_patrimonio: number;
  sigla_equipamento: string;
  status: Status;
}

interface RegistrationListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  limit?: number;
}

export async function listAdminRegistrations(
  supabase: SupabaseClient,
  options: RegistrationListOptions = {},
): Promise<{ rows: RegistrationListRow[]; total: number }> {
  const [{ data: cadastros, error: cadastrosError }, { data: patrimonios, error: patrimoniosError }] = await Promise.all([
    supabase.from("cadastros").select("id, request_id, unidade_id, unidade_nome, created_at"),
    supabase
      .from("patrimonios")
      .select("id, cadastro_id, equipamento_id, equipamento_nome, numero_patrimonio, sigla_equipamento, status"),
  ]);

  if (cadastrosError) throw cadastrosError;
  if (patrimoniosError) throw patrimoniosError;

  const cadastrosById = new Map((cadastros ?? []).map((cadastro) => [cadastro.id, cadastro as CadastroRow]));
  const normalizedSearch = options.search?.trim().toLowerCase() ?? "";
  const normalizedStatus = options.status?.trim();

  let rows = (patrimonios ?? [])
    .map((patrimonio) => {
      const item = patrimonio as PatrimonioRow;
      const cadastro = cadastrosById.get(item.cadastro_id);
      if (!cadastro) {
        return null;
      }

      return {
        cadastro_id: cadastro.id,
        cadastro_created_at: cadastro.created_at,
        request_id: cadastro.request_id,
        unidade_id: cadastro.unidade_id,
        unidade_nome: cadastro.unidade_nome,
        patrimonio_id: item.id,
        equipamento_id: item.equipamento_id,
        equipamento_nome: item.equipamento_nome,
        numero_patrimonio: item.numero_patrimonio,
        numero_patrimonio_text: String(item.numero_patrimonio),
        sigla_equipamento: item.sigla_equipamento,
        status: item.status,
      };
    })
    .filter((row): row is RegistrationListRow & { numero_patrimonio_text: string } => Boolean(row))
    .sort((left, right) => new Date(right.cadastro_created_at).getTime() - new Date(left.cadastro_created_at).getTime());

  if (normalizedStatus) {
    rows = rows.filter((row) => row.status === normalizedStatus);
  }

  if (normalizedSearch) {
    rows = rows.filter((row) =>
      [row.unidade_nome, row.equipamento_nome, row.numero_patrimonio_text].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }

  const total = rows.length;
  if (options.limit !== undefined) {
    rows = rows.slice(0, options.limit);
  } else if (options.page !== undefined && options.pageSize !== undefined) {
    const start = (options.page - 1) * options.pageSize;
    rows = rows.slice(start, start + options.pageSize);
  }

  return { rows, total };
}
