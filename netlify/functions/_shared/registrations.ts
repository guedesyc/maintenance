import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { PatrimonioType, RegistrationListRow, Status } from "../../../shared/types.ts";

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
  cadastro_item_id: string;
  equipamento_id: string | null;
  equipamento_nome: string;
  numero_patrimonio: number | null;
  patrimonio_codigo: string | null;
  sigla_equipamento: string;
  status: Status;
  equipamento_cliente: boolean;
  tipo_patrimonio: PatrimonioType | null;
}

interface CadastroItemRow {
  id: string;
  cadastro_id: string;
  equipamento_id: string | null;
  equipamento_nome: string;
  sigla_equipamento: string;
  status: Status;
  equipamento_cliente: boolean;
  tipo_patrimonio: PatrimonioType | null;
  sem_patrimonio: boolean;
}

interface RegistrationListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  responsavel?: string;
  limit?: number;
}

export async function listAdminRegistrations(
  supabase: SupabaseClient,
  options: RegistrationListOptions = {},
): Promise<{ rows: RegistrationListRow[]; total: number; unitNames: string[] }> {
  const [cadastros, itens, patrimonios, unidades] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("cadastros").select("id, request_id, unidade_id, unidade_nome, created_at").range(from, to)),
    fetchAllRows((from, to) => supabase.from("cadastro_itens").select("id, cadastro_id, equipamento_id, equipamento_nome, sigla_equipamento, status, equipamento_cliente, tipo_patrimonio, sem_patrimonio").range(from, to)),
    fetchAllRows((from, to) => supabase.from("patrimonios").select("id, cadastro_id, cadastro_item_id, equipamento_id, equipamento_nome, numero_patrimonio, patrimonio_codigo, sigla_equipamento, status, equipamento_cliente, tipo_patrimonio").range(from, to)),
    fetchAllRows((from, to) => supabase.from("unidades").select("id, responsavel").range(from, to)),
  ]);

  const cadastrosById = new Map(cadastros.map((cadastro) => [cadastro.id, cadastro as CadastroRow]));
  const responsavelByUnitId = new Map(unidades.map((unidade) => [unidade.id, unidade.responsavel ?? null]));
  const patrimoniosByItemId = new Map(
    patrimonios.map((patrimonio) => {
      const item = patrimonio as PatrimonioRow;
      return [item.cadastro_item_id, item];
    }),
  );
  const normalizedSearch = options.search?.trim().toLowerCase() ?? "";
  const normalizedStatus = options.status?.trim();

  let rows = itens
    .map((cadastroItem) => {
      const item = cadastroItem as CadastroItemRow;
      const cadastro = cadastrosById.get(item.cadastro_id);
      if (!cadastro) {
        return null;
      }
      const patrimonio = patrimoniosByItemId.get(item.id);

      return {
        cadastro_id: cadastro.id,
        cadastro_created_at: cadastro.created_at,
        request_id: cadastro.request_id,
        unidade_id: cadastro.unidade_id,
        unidade_nome: cadastro.unidade_nome,
        responsavel: responsavelByUnitId.get(cadastro.unidade_id) ?? null,
        item_id: item.id,
        patrimonio_id: patrimonio?.id ?? null,
        equipamento_id: item.equipamento_id,
        equipamento_nome: item.equipamento_nome,
        numero_patrimonio: patrimonio?.numero_patrimonio ?? null,
        patrimonio_codigo: patrimonio?.patrimonio_codigo ?? null,
        numero_patrimonio_text: patrimonio?.patrimonio_codigo ?? "",
        sigla_equipamento: item.sigla_equipamento,
        status: item.status,
        equipamento_cliente: item.equipamento_cliente,
        tipo_patrimonio: item.tipo_patrimonio ?? (item.equipamento_cliente ? "CLIENTE" : "PROPRIO"),
        sem_patrimonio: item.sem_patrimonio ?? false,
        patrimonio_pendente: !patrimonio && !item.sem_patrimonio && !item.equipamento_cliente && item.tipo_patrimonio !== "COMODATO",
      };
    })
    .filter((row): row is RegistrationListRow & { numero_patrimonio_text: string } => Boolean(row))
    .sort((left, right) => new Date(right.cadastro_created_at).getTime() - new Date(left.cadastro_created_at).getTime());

  if (normalizedStatus) {
    rows = rows.filter((row) => row.status === normalizedStatus);
  }

  if (options.responsavel) {
    rows = rows.filter((row) => row.responsavel === options.responsavel);
  }

  if (normalizedSearch) {
    rows = rows.filter((row) =>
      [row.unidade_nome, row.equipamento_nome, row.numero_patrimonio_text, row.patrimonio_pendente ? "pendente" : ""].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }

  const total = rows.length;
  const unitNames = [...new Set(rows.map((row) => row.unidade_nome))].sort((left, right) => left.localeCompare(right, "pt-BR"));
  if (options.limit !== undefined) {
    rows = rows.slice(0, options.limit);
  } else if (options.page !== undefined && options.pageSize !== undefined) {
    const start = (options.page - 1) * options.pageSize;
    rows = rows.slice(start, start + options.pageSize);
  }

  return { rows, total, unitNames };
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
