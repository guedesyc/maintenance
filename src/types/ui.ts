import type { EquipmentCatalogItem, RegistrationResult, Status, Unit } from "@shared/types";

export interface EquipmentDraft {
  localId: string;
  mode: "catalog" | "manual";
  equipment: EquipmentCatalogItem | null;
  equipmentText: string;
  status: Status;
  customerEquipment: boolean;
  customerPatrimonio: string;
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
