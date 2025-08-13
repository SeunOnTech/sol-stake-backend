// src/schemas/validatorSchema.ts
import { z } from "zod";

export const validatorSchema = z.object({
  voteAccount: z.string().min(1, "voteAccount required"),
  validatorPubkey: z.string().min(1, "validatorPubkey required"),
  commission: z.number().nullable(),
  uptime: z.number(),
  name: z.string().nullable().optional(),
});

export type ValidatorInput = z.infer<typeof validatorSchema>;
