import { INestApplication } from '@nestjs/common';
import { createTestApp, resetDatabase, countRows } from '../helpers/app-factory';
import { buildTripScenario, TripScenario } from '../helpers/scenario';

describe('共同支出：金额、参与人、说明的入参边界', () => {
  let app: INestApplication;
  let scenario: TripScenario;

  /** 一个会被拒绝的标准合法外壳，仅替换其中某个字段制造非法输入。 */
  const basePayload = () => ({ payerId: scenario.members[0].id, participantIds: [scenario.members[0].id], amount: 10 });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    scenario = await buildTripScenario(app);
  });

  afterAll(async () => {
    await app.close();
  });

  /** 断言请求被拒绝（400），且 expenses / expense_shares 两张表都没有新增任何行。 */
  async function expectRejectedWithoutWrite(payload: unknown, expectedCode?: string) {
    const { harness, tripId, members } = scenario;
    const expensesBefore = await countRows(app, 'expenses');
    const sharesBefore = await countRows(app, 'expense_shares');

    const res = await harness.addExpense(members[0].token, tripId, payload);

    expect(res.status).toBe(400);
    if (expectedCode) expect(res.body.code).toBe(expectedCode);
    expect(await countRows(app, 'expenses')).toBe(expensesBefore);
    expect(await countRows(app, 'expense_shares')).toBe(sharesBefore);
  }

  it('金额为零或负数被拒绝', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 0 }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: -100 }, 'EXPENSE_AMOUNT_INVALID');
  });

  it('小于最小货币单位（亚分）的金额被拒绝，而不是按零写入', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 0.001 }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 0.005 }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 0.0001 }, 'EXPENSE_AMOUNT_INVALID');
  });

  it('超过 DECIMAL(10,2) 存储上限的金额被拒绝', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 100_000_000 }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 1e12 }, 'EXPENSE_AMOUNT_INVALID');
  });

  it('非数字金额、超过两位小数被拒绝', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), amount: '10' }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 10.999 }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: null }, 'EXPENSE_AMOUNT_INVALID');
    await expectRejectedWithoutWrite({ ...basePayload(), amount: NaN }, 'EXPENSE_AMOUNT_INVALID');
  });

  it('参与人不能为空', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: [] }, 'EXPENSE_PARTICIPANTS_REQUIRED');
    const { payerId, amount } = basePayload();
    await expectRejectedWithoutWrite({ payerId, amount }, 'EXPENSE_PARTICIPANTS_REQUIRED');
  });

  it('参与人传成字符串或包含非整数时被拒绝（不做隐式转换）', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: ['1', '2'] }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: '1,2' }, 'EXPENSE_PARTICIPANTS_REQUIRED');
    await expectRejectedWithoutWrite(
      { ...basePayload(), participantIds: [scenario.members[0].id, String(scenario.members[1].id)] },
      'VALIDATION_FAILED'
    );
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: [1.5] }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: [null] }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), participantIds: 42 }, 'EXPENSE_PARTICIPANTS_REQUIRED');
  });

  it('说明传成非文本被拒绝', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), description: 123 }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), description: { text: 'x' } }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), description: ['x'] }, 'VALIDATION_FAILED');
    await expectRejectedWithoutWrite({ ...basePayload(), description: true }, 'VALIDATION_FAILED');
  });

  it('超过 255 字的说明被拒绝', async () => {
    await expectRejectedWithoutWrite({ ...basePayload(), description: '好'.repeat(256) }, 'VALIDATION_FAILED');
  });

  it('合法边界金额（0.01 与上限）可正常写入并回读', async () => {
    const { harness, tripId, members } = scenario;
    const min = await harness.addExpense(members[0].token, tripId, { ...basePayload(), amount: 0.01 });
    const max = await harness.addExpense(members[0].token, tripId, { ...basePayload(), amount: 99_999_999.99 });
    expect(min.status).toBe(201);
    expect(max.status).toBe(201);
    expect(min.body.amount).toBe(0.01);
    expect(max.body.amount).toBe(99_999_999.99);
  });

  it('合法说明：255 字可写入，缺省按空字符串处理', async () => {
    const { harness, tripId, members } = scenario;
    const longText = await harness.addExpense(members[0].token, tripId, { ...basePayload(), description: '好'.repeat(255) });
    expect(longText.status).toBe(201);
    expect(longText.body.description).toHaveLength(255);

    const { payerId, participantIds, amount } = basePayload();
    const noDesc = await harness.addExpense(members[0].token, tripId, { payerId, participantIds, amount });
    expect(noDesc.status).toBe(201);
    expect(noDesc.body.description).toBe('');
  });
});
