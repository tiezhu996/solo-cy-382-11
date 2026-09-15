import { INestApplication } from '@nestjs/common';
import { createTestApp, resetDatabase } from '../helpers/app-factory';
import { Harness } from '../helpers/harness';

describe('账户认证', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    harness = new Harness(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('注册结果不包含密码散列', async () => {
    const res = await harness.call('post', '/api/users/register', undefined, {
      email: 'new@example.com',
      nickname: '新人',
      password: 'secret123'
    });
    expect(res.status).toBe(201);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body).toMatchObject({ email: 'new@example.com', nickname: '新人' });
    expect(typeof res.body.id).toBe('number');
  });

  it('错误密码登录明确返回 401，而非 200 空数据', async () => {
    const account = await harness.signup('阿大');
    const res = await harness.call('post', '/api/users/login', undefined, {
      email: account.email,
      password: 'wrong-password'
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.token).toBeUndefined();
  });

  it('未知账号登录返回 401', async () => {
    const res = await harness.call('post', '/api/users/login', undefined, {
      email: 'ghost@example.com',
      password: 'whatever'
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('正确密码登录返回 token', async () => {
    const account = await harness.signup('阿大');
    expect(account.token).toEqual(expect.any(String));
  });
});
