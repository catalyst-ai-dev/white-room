import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default function TestingController(fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/testing-hello-1234',
    handler: async function (request: FastifyRequest, reply: FastifyReply) {
      return { ok: true };
    },
  });
}
