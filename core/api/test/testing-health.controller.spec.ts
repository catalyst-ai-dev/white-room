import { ApiTestService } from './lib/ApiTestService';

describe('Testing Health', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /testing-health returns ok: true', async () => {
    const response = await testService.get({
      path: '/testing-health',
      expectedCode: 200,
    });

    expect(response).toEqual({
      ok: true,
    });
  });
});
