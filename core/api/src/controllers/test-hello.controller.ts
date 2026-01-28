import type { FastifyInstance } from 'fastify';

export default function TestHelloController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/test-hello',
    handler: () => {
      return { ok: true };
    },
  });
}
