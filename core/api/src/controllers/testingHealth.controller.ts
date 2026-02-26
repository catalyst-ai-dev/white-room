import type { FastifyInstance } from 'fastify';
import { zodToJsonSchema } from '@namespace/shared';
import { TestingHealthResponseSchema, TestingHello1234ResponseSchema } from '../schemas/testingHealth.schemas';

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

  fastify.route({
    method: 'GET',
    url: '/testing-hello-1234',
    schema: {
      response: {
        200: zodToJsonSchema(TestingHello1234ResponseSchema),
      },
    },
    handler: async function () {
      return { ok: true as const };
    },
  });
}
