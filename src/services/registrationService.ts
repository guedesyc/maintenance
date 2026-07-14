import type { RegistrationPayload, RegistrationResult } from "@shared/types";
import { PUBLIC_ERROR_MESSAGE } from "@shared/constants";

export async function createRegistration(payload: RegistrationPayload): Promise<RegistrationResult> {
  const response = await fetch("/api/public-create-registration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as RegistrationResult | { error?: string } | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? PUBLIC_ERROR_MESSAGE);
  }

  return body as RegistrationResult;
}
