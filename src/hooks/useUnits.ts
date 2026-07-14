import { useCallback } from "react";
import { listActiveUnits } from "@/services/unitService";
import { useAsyncList } from "./useAsyncList";

export function useUnits() {
  return useAsyncList(useCallback(() => listActiveUnits(), []));
}
