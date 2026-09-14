import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '../../constants/errors';
import { AppException } from '../errors/app.exception';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new AppException(ERROR_CODES.AUTH_REQUIRED, '请先登录', 401);
    try {
      req.user = this.jwt.verify(token);
    } catch {
      // 非法、伪造或过期令牌一律视为未授权，避免裸异常被当成 500。
      throw new AppException(ERROR_CODES.AUTH_REQUIRED, '登录已失效，请重新登录', 401);
    }
    return true;
  }
}
