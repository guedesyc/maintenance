import type { EquipmentCatalogItem, RegistrationResult, Status, Unit } from "@shared/types";

export interface EquipmentDraft {
  localId: string;
  equipment: EquipmentCatalogItem | null;
  equipmentText: string;
  status: Status;
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
