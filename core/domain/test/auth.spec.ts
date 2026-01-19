import { describe, expect, test, beforeAll } from '@jest/globals';
import { InvalidCredentialsError, NoUserLoginFoundError } from '@domain/auth/auth.errors';
import { TestService } from './lib/TestService';

jest.mock('@namespace/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }),
}));

describe('Auth Service', () => {
  const testService = new TestService({ context: 'domain' });

  beforeAll(async () => {
    await testService.initDataSource();
    await testService.resetData();
  });

  afterAll(async () => {
    await testService.destroyDataSource();
  });

  test('login with email', async () => {
    const {
      domain: {
        auth: { authService },
      },
      factories: { userFactory },
    } = testService;

    const password = '1234';
    const testUser = await userFactory.create();

    const { user: loggedInUser, token } = await authService.login({
      email: testUser.email,
      password,
    });

    expect(loggedInUser).toBeDefined();
    expect(token).toBeDefined();
  });

  test('login with phone', async () => {
    const {
      domain: {
        auth: { authService },
      },
      factories: { userFactory },
    } = testService;

    const password = '1234';
    const testUser = await userFactory.create();

    const { user: loggedInUser, token } = await authService.login({
      phone: testUser.phone,
      password,
    });

    expect(loggedInUser).toBeDefined();
    expect(token).toBeDefined();
  });

  test('login with invalid credentials', async () => {
    const {
      domain: {
        auth: { authService },
      },
      factories: { userFactory },
    } = testService;

    const testUser = await userFactory.create();

    await expect(
      authService.login({
        email: testUser.email,
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  test('login with non-existent user', async () => {
    const {
      domain: {
        auth: { authService },
      },
    } = testService;

    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: '1234',
      }),
    ).rejects.toThrow(NoUserLoginFoundError);
  });
});
