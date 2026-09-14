import { api, tokenStore } from '../api';
import type { LoginResult } from '../types';

/** 用户注册与登录，登录成功后保存 JWT。 */
export const authApi = {
  async register(email: string, nickname: string, password: string): Promise<LoginResult> {
    const result = await api<LoginResult>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, nickname, password })
    });
    return result;
  },

  async login(email: string, password: string): Promise<LoginResult> {
    const result = await api<LoginResult>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (!result?.token) throw new Error('邮箱或密码错误');
    tokenStore.set(result.token);
    return result;
  },

  /** 注册成功后自动登录（注册接口不直接签发 token）。 */
  async registerAndLogin(email: string, nickname: string, password: string): Promise<LoginResult> {
    await this.register(email, nickname, password);
    return this.login(email, password);
  },

  logout(): void {
    tokenStore.clear();
  }
};
