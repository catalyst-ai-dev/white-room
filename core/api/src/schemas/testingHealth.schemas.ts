import { z } from 'zod';

export const TestingHealthResponseSchema = z.object({
  ok: z.literal(true),
});

export const TestingHello1234ResponseSchema = z.object({
  ok: z.literal(true),
});
