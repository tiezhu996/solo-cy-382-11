import { INestApplication } from '@nestjs/common';
import { createTestApp, resetDatabase, countRows } from '../helpers/app-factory';
import { buildTripScenario } from '../helpers/scenario';

describe('共同支出：鉴权、成员资格与跨行程隔离', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('无令牌、伪造令牌、篡改令牌访问支出接口都明确返回 401', async () => {
    const { harness, tripId, members } = await buildTripScenario(app);
    const validToken = members[0].token;
    const tampered = validToken.slice(0, -4) + 'XXXX';

    for (const token of [undefined, 'not-a-real-token', tampered, 'garbage']) {
      const list = await harness.call('get', `/api/trips/${tripId}/expenses`, token);
      expect(list.status).toBe(401);
      expect(list.body.code).toBe('AUTH_REQUIRED');

      const settlement = await harness.call('get', `/api/trips/${tripId}/expenses/settlement`, token);
      expect(settlement.status).toBe(401);
    }
  });

  it('非成员不能查看或新增行程支出，返回 403', async () => {
    const { harness, tripId, members, outsider } = await buildTripScenario(app);

    const list = await harness.listExpenses(outsider.token, tripId);
    expect(list.status).toBe(403);
    expect(list.body.code).toBe('NOT_TRIP_MEMBER');

    const create = await harness.addExpense(outsider.token, tripId, {
      payerId: outsider.id,
      participantIds: [outsider.id],
      amount: 10
    });
    expect(create.status).toBe(403);
    expect(create.body.code).toBe('NOT_TRIP_MEMBER');

    // 非成员的 403 不得产生任何支出或分摊
    expect(await countRows(app, 'expenses')).toBe(0);
    expect(await countRows(app, 'expense_shares')).toBe(0);

    // 成员自己的访问仍正常
    expect((await harness.listExpenses(members[0].token, tripId)).status).toBe(200);
  });

  it('不同行程的数据互不读取：借其它行程路径访问他行程支出返回 404', async () => {
    const { harness, tripId, otherTripId, members, outsider } = await buildTripScenario(app);

    // 在 tripId 中记一笔
    const created = await harness.addExpense(members[0].token, tripId, {
      payerId: members[0].id,
      participantIds: [members[0].id, members[1].id],
      amount: 100
    });

    // 外部行程成员用自己行程的路径读取该支出 id：必须 404
    const cross = await harness.expenseDetail(outsider.token, otherTripId, created.body.id);
    expect(cross.status).toBe(404);
    expect(cross.body.code).toBe('EXPENSE_NOT_FOUND');

    // 外部行程结算里看不到这笔数据
    const otherSettlement = await harness.settlement(outsider.token, otherTripId);
    expect(otherSettlement.body.totalAmount).toBe(0);

    // 本行程结算仍能看到
    const ownSettlement = await harness.settlement(members[0].token, tripId);
    expect(ownSettlement.body.totalAmount).toBe(100);
  });

  it('付款人或参与人若不是本行程成员，新增被拒绝', async () => {
    const { harness, tripId, members, outsider } = await buildTripScenario(app);

    const badPayer = await harness.addExpense(members[0].token, tripId, {
      payerId: outsider.id,
      participantIds: [members[0].id],
      amount: 50
    });
    expect(badPayer.status).toBe(400);
    expect(badPayer.body.code).toBe('PAYER_NOT_MEMBER');

    const badParticipant = await harness.addExpense(members[0].token, tripId, {
      payerId: members[0].id,
      participantIds: [members[0].id, outsider.id],
      amount: 50
    });
    expect(badParticipant.status).toBe(400);
    expect(badParticipant.body.code).toBe('NOT_TRIP_MEMBER');

    expect(await countRows(app, 'expenses')).toBe(0);
  });

  it('成员管理接口同样要求成员资格与有效令牌', async () => {
    const { harness, tripId, outsider } = await buildTripScenario(app);

    expect((await harness.call('get', `/api/trips/${tripId}/members`, undefined)).status).toBe(401);
    expect((await harness.members(outsider.token, tripId)).status).toBe(403);
  });
});
