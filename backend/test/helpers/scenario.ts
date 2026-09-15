import { INestApplication } from '@nestjs/common';
import { Harness, UserAccount } from './harness';

export interface TripScenario {
  harness: Harness;
  tripId: number;
  /** 已加入同一行程的三名成员。 */
  members: [UserAccount, UserAccount, UserAccount];
  /** 属于另一个行程的外部成员，用于隔离测试。 */
  outsider: UserAccount;
  otherTripId: number;
}

/**
 * 构造标准测试场景：三名成员共同加入 tripId 行程；另一名外部成员拥有并加入独立行程。
 * 每个用例前数据库已清空，因此行程、用户 id 都从 1 开始，断言可重复。
 */
export async function buildTripScenario(app: INestApplication): Promise<TripScenario> {
  const harness = new Harness(app);
  const members = [await harness.signup('阿大'), await harness.signup('阿二'), await harness.signup('阿三')] as [
    UserAccount,
    UserAccount,
    UserAccount
  ];
  const outsider = await harness.signup('外人');

  const { id: tripId } = await harness.createTrip(members[0].token, '大理');
  for (const member of members) {
    await harness.join(member.token, tripId);
  }

  const { id: otherTripId } = await harness.createTrip(outsider.token, '青海湖');
  await harness.join(outsider.token, otherTripId);

  return { harness, tripId, members, outsider, otherTripId };
}
