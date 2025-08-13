import { z } from 'zod';

export const ValidatorSchema = z.object({
  voteAccount: z.string().min(32),
  commission: z.number().min(0).max(100),
  uptime: z.number().min(0).max(100),
  name: z.string().optional().nullable(),
});

export type Validator = z.infer<typeof ValidatorSchema>;
