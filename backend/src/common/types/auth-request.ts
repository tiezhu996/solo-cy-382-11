/** JWT 解析后挂载在请求对象上的当前登录用户。 */
export interface AuthUser {
  userId: number;
  nickname: string;
}

/** 携带当前登录用户的请求类型，供需要鉴权的控制器使用。 */
export interface AuthRequest {
  user: AuthUser;
  headers: { authorization?: string };
}
