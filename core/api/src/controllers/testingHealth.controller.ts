import type { FastifyInstance } from 'fastify';

import { zodToJsonSchema } from '@namespace/shared';

import { TestingHealthResponseSchema } from '../schemas/testingHealth.schemas';

export default function TestingHealthController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/testing-health',
    schema: {
      response: {
        200: zodToJsonSchema(TestingHealthResponseSchema),
      },
    },
    handler: async function () {
      return { ok: true as const };
    },
  });
}
