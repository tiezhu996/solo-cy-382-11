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

  it('所有合法两位小数（含曾被误杀的 0.29/0.57/0.58）都能保存并原样回读', async () => {
    const { harness, tripId, members } = scenario;
    // 报告中的回归值 + 一组有二进制浮点误差风险的两位小数
    const amounts = [0.29, 0.57, 0.58, 0.07, 0.13, 0.17, 0.23, 0.31, 0.83, 1.07, 12.29, 100.57, 0.01, 99.99];

    for (const amount of amounts) {
      const res = await harness.addExpense(members[0].token, tripId, { ...basePayload(), amount });
      expect({ amount, status: res.status, code: res.body?.code }).toMatchObject({ amount, status: 201 });
      // 写入后回读，金额与输入一致（两位小数精度）
      const detail = await harness.expenseDetail(members[0].token, tripId, res.body.id);
      expect(detail.status).toBe(200);
      expect(detail.body.amount).toBeCloseTo(amount, 2);
    }

    const list = await harness.listExpenses(members[0].token, tripId);
    expect(list.body).toHaveLength(amounts.length);
  });

  it('三位及以上小数一律被拒绝（容差不能放过真正的亚分位）', async () => {
    // 0.001/0.005 等已由“亚分”用例覆盖，这里聚焦“>=1 分但含第三位小数”的值
    for (const amount of [0.011, 0.029, 0.123, 0.299, 1.235, 10.999, 0.579]) {
      await expectRejectedWithoutWrite({ ...basePayload(), amount }, 'EXPENSE_AMOUNT_INVALID');
    }
  });

  it('大额两位小数正常保存；贴网格的三位以上小数仍被拒绝', async () => {
    const { harness, tripId, members } = scenario;
    // 大额端浮点误差放大，曾是固定容差的贴边风险点
    for (const amount of [73_852_972.07, 99_999_999.99, 10_000_000.03]) {
      const res = await harness.addExpense(members[0].token, tripId, { ...basePayload(), amount });
      expect({ amount, status: res.status }).toMatchObject({ amount, status: 201 });
      expect(res.body.amount).toBeCloseTo(amount, 2);
    }
    // 小金额端容差必须足够紧：仅比 0.01 多 0.00001 的值含第五位小数，必须拒绝
    await expectRejectedWithoutWrite({ ...basePayload(), amount: 0.01001 }, 'EXPENSE_AMOUNT_INVALID');
  });

  it('0.29 在三人分摊时余数按分补齐且合计仍是 0.29，结算总额正确', async () => {
    const { harness, tripId, members } = scenario;
    const res = await harness.addExpense(members[0].token, tripId, {
      payerId: members[0].id,
      participantIds: members.map(m => m.id),
      amount: 0.29
    });
    expect(res.status).toBe(201);
    const shares = res.body.participants.map((p: any) => p.shareAmount);
    expect(shares).toEqual([0.1, 0.1, 0.09]);
    expect(Math.round(shares.reduce((s: number, v: number) => s + v, 0) * 100)).toBe(29);

    const settlement = await harness.settlement(members[0].token, tripId);
    expect(settlement.body.totalAmount).toBeCloseTo(0.29, 2);
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
