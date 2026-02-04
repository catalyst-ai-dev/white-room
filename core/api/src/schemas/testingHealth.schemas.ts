import { z } from 'zod';

export const TestingHealthResponseSchema = z.object({
  ok: z.literal(true),
});

export type TestingHealthResponse = z.infer<typeof TestingHealthResponseSchema>;
