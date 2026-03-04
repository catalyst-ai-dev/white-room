import type { FastifyInstance } from 'fastify';

import { zodToJsonSchema } from '@namespace/shared';
import { HealthCheckResponseSchema } from '../schemas/healthCheck.schemas';

export default function HealthCheckController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/health-check',
    schema: {
      response: {
        200: zodToJsonSchema(HealthCheckResponseSchema),
      },
    },
    handler: async function () {
      return { status: 'ok' as const };
    },
  });
}
