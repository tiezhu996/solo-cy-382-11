import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { ERROR_CODES } from '../../constants/errors';
import { AppException } from '../../common/errors/app.exception';

/** 返回给客户端的用户信息，禁止包含密码散列。 */
export type PublicUser = Pick<UserEntity, 'id' | 'email' | 'nickname' | 'bio' | 'createdAt'>;

@Injectable()
export class UserService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>, private readonly jwt: JwtService) {}

  async register(email: string, nickname: string, password: string): Promise<PublicUser> {
    const user = this.users.create({ email, nickname, passwordHash: await bcrypt.hash(password, 10) });
    const saved = await this.users.save(user);
    return this.toPublic(saved);
  }

  async login(email: string, password: string) {
    const user = await this.users.findOneBy({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppException(ERROR_CODES.INVALID_CREDENTIALS, '邮箱或密码错误', 401);
    }
    return { token: this.jwt.sign({ userId: user.id, nickname: user.nickname }), user: { id: user.id, nickname: user.nickname } };
  }

  private toPublic(user: UserEntity): PublicUser {
    return { id: user.id, email: user.email, nickname: user.nickname, bio: user.bio, createdAt: user.createdAt };
  }
}
