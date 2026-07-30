import type { EquipmentCatalogItem, PatrimonioType, RegistrationResult, Status, Unit } from "@shared/types";

export interface EquipmentDraft {
  localId: string;
  mode: "catalog" | "manual";
  equipment: EquipmentCatalogItem | null;
  equipmentText: string;
  status: Status;
  customerEquipment: boolean;
  customerPatrimonio: string;
  patrimonioType: PatrimonioType;
}

export interface RegistrationFormState {
  unit: Unit | null;
  unitText: string;
  items: EquipmentDraft[];
  requestId: string;
}

export interface SubmitState {
  loading: boolean;
  error: string | null;
  result: RegistrationResult | null;
}
