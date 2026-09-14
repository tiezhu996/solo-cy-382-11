import type { AuthUser } from '../types';

const USER_KEY = 'tripmatch_user';

/** 当前登录用户的本地持久化，刷新页面后保持登录态。 */
export const sessionStore = {
  get(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(USER_KEY);
  }
};
