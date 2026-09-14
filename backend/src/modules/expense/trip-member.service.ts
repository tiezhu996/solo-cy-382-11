import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TripEntity } from '../trip/trip.entity';
import { UserEntity } from '../user/user.entity';
import { ERROR_CODES } from '../../constants/errors';
import { AppException } from '../../common/errors/app.exception';
import { TripMemberEntity } from './trip-member.entity';

/** 行程成员信息（附带昵称供前端展示）。 */
export interface TripMemberView {
  userId: number;
  nickname: string;
  joinedAt: Date;
}

@Injectable()
export class TripMemberService {
  constructor(
    @InjectRepository(TripMemberEntity) private readonly members: Repository<TripMemberEntity>,
    @InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>
  ) {}

  /** 校验行程存在；不存在直接抛 404，避免向无关行程写入数据。 */
  async assertTripExists(tripId: number): Promise<void> {
    const trip = await this.trips.findOne({ where: { id: tripId }, select: { id: true } });
    if (!trip) throw new AppException(ERROR_CODES.TRIP_NOT_FOUND, '行程不存在', 404);
  }

  /** 断言当前用户是行程成员，是共同支出一切读写的前置条件。 */
  async assertMember(tripId: number, userId: number): Promise<void> {
    const member = await this.members.findOne({ where: { tripId, userId }, select: { id: true } });
    if (!member) throw new AppException(ERROR_CODES.NOT_TRIP_MEMBER, '仅行程成员可操作该行程的共同支出', 403);
  }

  /** 当前用户加入行程成为成员。 */
  async join(tripId: number, userId: number): Promise<TripMemberView> {
    await this.assertTripExists(tripId);
    const existing = await this.members.findOne({ where: { tripId, userId }, select: { id: true } });
    if (existing) throw new AppException(ERROR_CODES.ALREADY_TRIP_MEMBER, '你已是该行程成员');
    const saved = await this.members.save(this.members.create({ tripId, userId }));
    const user = await this.users.findOne({ where: { id: userId }, select: { nickname: true } });
    return { userId, nickname: user?.nickname ?? `用户${userId}`, joinedAt: saved.joinedAt };
  }

  /** 列出行程全部成员（仅成员可查看）。 */
  async listMembers(tripId: number): Promise<TripMemberView[]> {
    const rows = await this.members.find({ where: { tripId }, order: { id: 'ASC' } });
    if (rows.length === 0) return [];
    const users = await this.users.find({ where: { id: In(rows.map(row => row.userId)) }, select: { id: true, nickname: true } });
    const nicknameOf = new Map(users.map(user => [user.id, user.nickname]));
    return rows.map(row => ({
      userId: row.userId,
      nickname: nicknameOf.get(row.userId) ?? `用户${row.userId}`,
      joinedAt: row.joinedAt
    }));
  }

  /** 返回行程成员的 userId 集合，供分摊时校验参与人。 */
  async memberIdSet(tripId: number): Promise<Set<number>> {
    const rows = await this.members.find({ where: { tripId }, select: { userId: true } });
    return new Set(rows.map(row => row.userId));
  }
}
