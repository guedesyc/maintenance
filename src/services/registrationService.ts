import type { RegistrationPayload, RegistrationResult } from "@shared/types";
import { PUBLIC_ERROR_MESSAGE } from "@shared/constants";
import { supabase } from "./supabase";

export async function createRegistration(payload: RegistrationPayload): Promise<RegistrationResult> {
  const { data, error } = await supabase.rpc("create_registration", {
    payload,
  });

  if (error) {
    throw new Error(PUBLIC_ERROR_MESSAGE);
  }

  return data as RegistrationResult;
}
