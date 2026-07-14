export type Status = "ATIVO" | "INATIVO";

export interface CatalogItem {
  id: string;
  nome: string;
  nome_normalizado: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Unit extends CatalogItem {}

export interface EquipmentCatalogItem extends CatalogItem {}

export interface RegistrationEquipmentInput {
  equipamento_id: string;
  status: Status;
}

export interface RegistrationPayload {
  request_id: string;
  unidade_id: string;
  equipamentos: RegistrationEquipmentInput[];
}

export interface RegistrationResultItem {
  patrimonio_id: string;
  equipamento_id: string;
  equipamento_nome: string;
  numero_patrimonio: number;
  status: Status;
  sigla_equipamento: string;
}

export interface RegistrationResult {
  cadastro_id: string;
  request_id: string;
  unidade_id: string;
  unidade_nome: string;
  created_at: string;
  equipamentos: RegistrationResultItem[];
}

export interface RegistrationListRow {
  cadastro_id: string;
  cadastro_created_at: string;
  request_id: string;
  unidade_id: string;
  unidade_nome: string;
  patrimonio_id: string;
  equipamento_id: string;
  equipamento_nome: string;
  numero_patrimonio: number;
  sigla_equipamento: string;
  status: Status;
}

export interface ImportPreviewRow {
  original: string;
  normalized: string;
}

export interface ImportParseResult {
  rows: ImportPreviewRow[];
  skippedDuplicates: number;
  skippedEmpty: number;
  sheetName: string;
}

export interface ImportSummary {
  totalRead: number;
  imported: number;
  duplicates: number;
  empty: number;
  mode: "ADD" | "REPLACE";
}

export interface AdminSessionResponse {
  authenticated: boolean;
  username?: string;
}

export interface DashboardSummary {
  totalCadastros: number;
  totalPatrimonios: number;
  unidadesAtivas: number;
  equipamentosAtivos: number;
  totalImportacoes: number;
  ultimosCadastros: RegistrationListRow[];
}

export interface ExportTemplateMetadata {
  path: string;
  filename: string;
  sheetName: string;
  updatedAt: string;
  source: "uploaded" | "default";
}
