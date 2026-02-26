import { ApiTestService } from './lib/ApiTestService';

describe('Testing Hello 1234 Controller', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /testing-hello-1234 returns 200 with ok: true', async () => {
    const response = await testService.get({
      path: '/testing-hello-1234',
      expectedCode: 200,
    });

    expect(response).toEqual({ ok: true });
    expect(response).toHaveProperty('ok', true);
  });
});
