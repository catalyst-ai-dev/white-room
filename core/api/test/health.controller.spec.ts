import { ApiTestService } from './lib/ApiTestService';

describe('Health', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
    await testService.resetData();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /health', async () => {
    const response = await testService.get({
      path: '/health',
      expectedCode: 200,
    });
    expect(response).toEqual({ status: 'ok' });
  });

  test('GET /testing-health', async () => {
    const response = await testService.get({
      path: '/testing-health',
      expectedCode: 200,
    });
    expect(response).toEqual({ ok: true });
  });
});
