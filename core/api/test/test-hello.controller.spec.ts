import { ApiTestService } from './lib/ApiTestService';

describe('TestHello', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  describe('GET /test-hello', () => {
    it('should return 200 with { ok: true }', async () => {
      const response = await testService.fastifyApp.inject({
        method: 'GET',
        url: '/test-hello',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
    });

    it('should return application/json content type', async () => {
      const response = await testService.fastifyApp.inject({
        method: 'GET',
        url: '/test-hello',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject POST requests', async () => {
      const response = await testService.fastifyApp.inject({
        method: 'POST',
        url: '/test-hello',
      });

      expect(response.statusCode).toBe(405);
    });

    it('should reject PUT requests', async () => {
      const response = await testService.fastifyApp.inject({
        method: 'PUT',
        url: '/test-hello',
      });

      expect(response.statusCode).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const response = await testService.fastifyApp.inject({
        method: 'DELETE',
        url: '/test-hello',
      });

      expect(response.statusCode).toBe(405);
    });
  });
});
