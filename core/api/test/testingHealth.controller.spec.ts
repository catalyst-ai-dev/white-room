import { ApiTestService } from './lib/ApiTestService';

describe('TestingHealth', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /testing-health', async () => {
    const response = await testService.get({
      path: '/testing-health',
      expectedCode: 200,
    });
    expect(response).toEqual({ ok: true });
  });
});
