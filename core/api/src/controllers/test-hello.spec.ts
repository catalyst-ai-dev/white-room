import type { FastifyInstance } from 'fastify';

import TestHelloController from './test-hello.controller';

describe('TestHelloController', () => {
  let mockFastify: FastifyInstance;
  let routeHandler: () => { ok: boolean };

  beforeEach(() => {
    mockFastify = {
      route: jest.fn((options) => {
        routeHandler = options.handler;
      }),
    } as unknown as FastifyInstance;
  });

  describe('Route Registration', () => {
    it('should register GET route at /test-hello', () => {
      TestHelloController(mockFastify);

      expect(mockFastify.route).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test-hello',
        }),
      );
    });
  });

  describe('Handler Response', () => {
    beforeEach(() => {
      TestHelloController(mockFastify);
    });

    it('should return { ok: true }', () => {
      const response = routeHandler();

      expect(response).toEqual({ ok: true });
    });

    it('should return object with only ok property', () => {
      const response = routeHandler();

      expect(Object.keys(response)).toEqual(['ok']);
    });

    it('should return ok as boolean true', () => {
      const response = routeHandler();

      expect(response.ok).toBe(true);
      expect(typeof response.ok).toBe('boolean');
    });
  });
});
