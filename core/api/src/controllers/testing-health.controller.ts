import type { FastifyInstance } from 'fastify';

export default function TestingHealthController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/testing-health',
    handler: () => {
      return { ok: true };
    },
  });
}
