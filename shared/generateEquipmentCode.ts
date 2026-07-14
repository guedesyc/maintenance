import { normalizeText } from "./normalizeText";

export function generateEquipmentCode(name: string): string {
  return normalizeText(name).replace(/\s+/g, "").slice(0, 3);
}
