import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export interface UserAccount {
  id: number;
  nickname: string;
  email: string;
  token: string;
}

/**
 * 测试夹具：封装对真实 HTTP 服务的请求，以及注册、建行程、加入成员等高频操作。
 * 每个用例使用全新内存库，邮箱仍带上序号以保证语义独立。
 */
export class Harness {
  private readonly http: Server;
  private seq = 0;

  constructor(private readonly app: INestApplication) {
    this.http = app.getHttpServer();
  }

  async call<T = any>(method: 'get' | 'post', path: string, token?: string, body?: unknown): Promise<ApiResponse<T>> {
    let req = request(this.http)[method](path);
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) req = req.send(body as object);
    const res = await req;
    return { status: res.status, body: res.body as T };
  }

  /** 注册并登录，返回带 token 的账号。 */
  async signup(nickname: string): Promise<UserAccount> {
    this.seq += 1;
    const email = `${nickname}-${this.seq}@example.com`;
    const password = 'pass1234';
    await this.call('post', '/api/users/register', undefined, { email, nickname, password });
    const login = await this.call('post', '/api/users/login', undefined, { email, password });
    return { id: login.body.user.id, nickname, email, token: login.body.token };
  }

  async createTrip(token: string, destination = '测试行程'): Promise<{ id: number }> {
    const res = await this.call('post', '/api/trips', token, {
      ownerId: 0,
      destination,
      departDate: '2026-09-14',
      days: 3,
      transport: '公共交通',
      companionCount: 3
    });
    return res.body;
  }

  async join(token: string, tripId: number): Promise<ApiResponse> {
    return this.call('post', `/api/trips/${tripId}/members/join`, token);
  }

  async addExpense(token: string, tripId: number, payload: unknown): Promise<ApiResponse> {
    return this.call('post', `/api/trips/${tripId}/expenses`, token, payload);
  }

  async listExpenses(token: string, tripId: number): Promise<ApiResponse> {
    return this.call('get', `/api/trips/${tripId}/expenses`, token);
  }

  async expenseDetail(token: string, tripId: number, expenseId: number): Promise<ApiResponse> {
    return this.call('get', `/api/trips/${tripId}/expenses/${expenseId}`, token);
  }

  async settlement(token: string, tripId: number): Promise<ApiResponse> {
    return this.call('get', `/api/trips/${tripId}/expenses/settlement`, token);
  }

  async members(token: string, tripId: number): Promise<ApiResponse> {
    return this.call('get', `/api/trips/${tripId}/members`, token);
  }
}
