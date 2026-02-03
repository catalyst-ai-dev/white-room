import { z } from 'zod';

export const TestingHelloResponseSchema = z.object({
  message: z.string().describe('Hello message'),
});

export type TestingHelloResponse = z.infer<typeof TestingHelloResponseSchema>;
