import { ApiTestService } from './lib/ApiTestService';

describe('Testing Controller Integration', () => {
  const testService = new ApiTestService();

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.closeServer();
  });

  test('GET /testing-hello', async () => {
    const response = await testService.fastifyApp.inject({
      method: 'GET',
      url: '/testing-hello',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ message: 'hello' });
  });

  test('should be accessible without authentication', async () => {
    const response = await testService.fastifyApp.inject({
      method: 'GET',
      url: '/testing-hello',
      cookies: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.message).toBe('hello');
  });

  test('should return valid JSON with correct Content-Type', async () => {
    const response = await testService.fastifyApp.inject({
      method: 'GET',
      url: '/testing-hello',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const body = response.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('message');
  });
});
