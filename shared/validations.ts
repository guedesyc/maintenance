import { z } from "zod";
import { STATUS_OPTIONS } from "./constants";

export const statusSchema = z.enum(STATUS_OPTIONS);

export const registrationPayloadSchema = z.object({
  request_id: z.string().uuid(),
  unidade_id: z.string().uuid(),
  equipamentos: z
    .array(
      z.object({
        equipamento_id: z.string().uuid().optional(),
        equipamento_nome: z.string().trim().min(1).optional(),
        status: statusSchema,
        equipamento_cliente: z.boolean().default(false),
        patrimonio_cliente: z.string().trim().optional(),
      }),
    )
    .min(1),
}).superRefine((payload, context) => {
  payload.equipamentos.forEach((item, index) => {
    if (!item.equipamento_id && !item.equipamento_nome) {
      context.addIssue({
        code: "custom",
        path: ["equipamentos", index, "equipamento_nome"],
        message: "Informe o equipamento.",
      });
    }

    if (item.equipamento_cliente && !item.patrimonio_cliente) {
      context.addIssue({
        code: "custom",
        path: ["equipamentos", index, "patrimonio_cliente"],
        message: "Informe o patrimonio do equipamento do cliente.",
      });
    }
  });
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
