/**
 * 统一的 HTTP 客户端：拼接 /api 前缀、注入 JWT、解析标准错误信息。
 * Token 存于 localStorage，登录后所有费用/成员请求自动带上鉴权头。
 */

const TOKEN_KEY = 'tripmatch_token';

export const tokenStore = {
  get(): string {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message = (data as { message?: string } | null)?.message ?? `请求失败 ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}
