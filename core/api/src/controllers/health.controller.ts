import type { FastifyInstance } from 'fastify';

export default function HealthController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/health',
    handler: () => {
      return { status: 'ok' };
    },
  });
}
