import { z } from "zod";
import { STATUS_OPTIONS } from "./constants";

export const statusSchema = z.enum(STATUS_OPTIONS);

export const registrationPayloadSchema = z.object({
  request_id: z.string().uuid(),
  unidade_id: z.string().uuid(),
  equipamentos: z
    .array(
      z.object({
        equipamento_id: z.string().uuid(),
        status: statusSchema,
      }),
    )
    .min(1),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
