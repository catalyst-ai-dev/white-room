import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import TestingController from './testing.controller';
import { TestingHelloResponseSchema } from '../schemas/testing.schemas';

describe('TestingController', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    fastify.register(TestingController);
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('GET /testing-hello', () => {
    it('should return hello message with 200 status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/testing-hello',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return valid JSON response', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/testing-hello',
      });

      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty('message');
      expect(typeof body.message).toBe('string');
    });

    it('should return exactly "hello" in message field', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/testing-hello',
      });

      const body = JSON.parse(response.payload);
      expect(body.message).toBe('hello');
    });

    it('should conform to TestingHelloResponseSchema', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/testing-hello',
      });

      const body = JSON.parse(response.payload);
      const validation = TestingHelloResponseSchema.safeParse(body);
      expect(validation.success).toBe(true);
    });

    it('should set Content-Type to application/json', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/testing-hello',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
