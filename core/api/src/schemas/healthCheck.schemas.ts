import { z } from 'zod';

export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
});
