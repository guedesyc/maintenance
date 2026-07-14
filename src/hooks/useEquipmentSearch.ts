import { useCallback } from "react";
import { listActiveEquipment } from "@/services/equipmentService";
import { useAsyncList } from "./useAsyncList";

export function useEquipmentSearch() {
  return useAsyncList(useCallback(() => listActiveEquipment(), []));
}
