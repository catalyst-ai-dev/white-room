import type { FastifyInstance } from 'fastify';

import { zodToJsonSchema } from '@namespace/shared';
import { TestingHelloResponseSchema } from '../schemas/testing.schemas';

export default function TestingController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/testing-hello',
    schema: {
      description: 'Simple testing endpoint that returns a hello message',
      response: {
        200: zodToJsonSchema(TestingHelloResponseSchema),
      },
    },
    async handler() {
      return {
        message: 'hello',
      };
    },
  });
}
