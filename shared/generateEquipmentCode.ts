import { normalizeText } from "./normalizeText.ts";

export function generateEquipmentCode(name: string): string {
  return normalizeText(name).replace(/\s+/g, "").slice(0, 3);
}
