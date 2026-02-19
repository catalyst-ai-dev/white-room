import { ApiTestService } from './lib/ApiTestService';

describe('Testing Health', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /testing-hello-123 returns { ok: true }', async () => {
    const result = await testService.get({
      path: '/testing-hello-123',
      expectedCode: 200,
    });
    expect(result).toEqual({ ok: true });
  });
});
