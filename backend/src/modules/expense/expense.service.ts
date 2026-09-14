import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ERROR_CODES } from '../../constants/errors';
import { AppException } from '../../common/errors/app.exception';
import { ExpenseEntity } from './expense.entity';
import { ExpenseShareEntity } from './expense-share.entity';
import { TripMemberService } from './trip-member.service';
import { splitAmountEvenly } from './split-money';
import { MemberBalance, settleTransfers, Transfer } from './transfer';

/** 创建支出的入参。 */
export interface CreateExpenseInput {
  payerId: number;
  participantIds: number[];
  amount: number;
  description?: string;
}

/** 单笔支出回读结构（含付款人与分摊成员）。 */
export interface ExpenseView {
  id: number;
  tripId: number;
  payerId: number;
  amount: number;
  description: string;
  createdAt: Date;
  participants: { userId: number; shareAmount: number }[];
}

/** 行程结算结果。 */
export interface SettlementView {
  tripId: number;
  currency: string;
  totalAmount: number;
  perMember: MemberBalance[];
  transfers: Transfer[];
}

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectRepository(ExpenseEntity) private readonly expenses: Repository<ExpenseEntity>,
    @InjectRepository(ExpenseShareEntity) private readonly shares: Repository<ExpenseShareEntity>,
    private readonly members: TripMemberService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * 新增一笔共同支出并落库分摊明细。
   * 规则：仅行程成员可操作；金额必须大于零；参与分摊成员不能为空且必须都是行程成员；
   * 付款人也必须是行程成员。支出与分摊在同一事务内写入，保证可回读、不出现半成品。
   */
  async create(tripId: number, operatorId: number, input: CreateExpenseInput): Promise<ExpenseView> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppException(ERROR_CODES.EXPENSE_AMOUNT_INVALID, '金额必须大于零');
    }
    const participantIds = Array.from(new Set((input.participantIds ?? []).map(Number).filter(id => Number.isInteger(id))));
    if (participantIds.length === 0) {
      throw new AppException(ERROR_CODES.EXPENSE_PARTICIPANTS_REQUIRED, '参与分摊成员不能为空');
    }
    const payerId = Number(input.payerId);
    if (!Number.isInteger(payerId)) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, '付款人不合法');
    }

    // 鉴权与跨行程隔离：操作者、付款人、参与人都必须属于本行程。
    await this.members.assertMember(tripId, operatorId);
    const memberSet = await this.members.memberIdSet(tripId);
    if (!memberSet.has(payerId)) {
      throw new AppException(ERROR_CODES.PAYER_NOT_MEMBER, '付款人必须是行程成员');
    }
    const outsider = participantIds.find(id => !memberSet.has(id));
    if (outsider !== undefined) {
      throw new AppException(ERROR_CODES.NOT_TRIP_MEMBER, '参与分摊成员必须都是本行程成员');
    }

    const shareAmounts = splitAmountEvenly(amount, participantIds.length);

    return this.dataSource.transaction(async manager => {
      const expense = await manager.save(
        manager.create(ExpenseEntity, {
          tripId,
          payerId,
          amount,
          description: (input.description ?? '').trim()
        })
      );
      const shareRows = participantIds.map((userId, index) =>
        manager.create(ExpenseShareEntity, { expenseId: expense.id, tripId, userId, shareAmount: shareAmounts[index] })
      );
      await manager.save(shareRows);
      this.logger.log(`行程 ${tripId} 新增支出 #${expense.id}，金额 ${amount}，${participantIds.length} 人分摊`);
      return this.getById(tripId, expense.id, manager);
    });
  }

  /** 列出行程全部支出（仅成员），分摊明细一并回读。 */
  async list(tripId: number, operatorId: number): Promise<ExpenseView[]> {
    await this.members.assertMember(tripId, operatorId);
    const rows = await this.expenses.find({ where: { tripId }, order: { id: 'ASC' } });
    return Promise.all(rows.map(row => this.assembleView(row)));
  }

  /** 读取单笔支出，并校验其确实归属该行程，杜绝跨行程读取。 */
  async detail(tripId: number, expenseId: number, operatorId: number): Promise<ExpenseView> {
    await this.members.assertMember(tripId, operatorId);
    const expense = await this.expenses.findOne({ where: { id: expenseId } });
    if (!expense || expense.tripId !== tripId) {
      throw new AppException(ERROR_CODES.EXPENSE_NOT_FOUND, '支出不存在', 404);
    }
    return this.assembleView(expense);
  }

  /** 计算行程结算：每人已付、应付、净额及最简收付款建议（仅成员）。 */
  async settlement(tripId: number, operatorId: number): Promise<SettlementView> {
    await this.members.assertMember(tripId, operatorId);
    const memberViews = await this.members.listMembers(tripId);
    const expenses = await this.expenses.find({ where: { tripId } });
    const shares = await this.shares.find({ where: { tripId } });

    const balanceOf = new Map<number, MemberBalance>(
      memberViews.map(member => [member.userId, { userId: member.userId, nickname: member.nickname, paid: 0, owed: 0, net: 0 }])
    );

    for (const expense of expenses) {
      const payer = balanceOf.get(expense.payerId);
      if (payer) payer.paid = round2(payer.paid + expense.amount);
    }
    for (const share of shares) {
      const member = balanceOf.get(share.userId);
      if (member) member.owed = round2(member.owed + share.shareAmount);
    }
    const perMember = Array.from(balanceOf.values()).map(member => ({ ...member, net: round2(member.paid - member.owed) }));

    return {
      tripId,
      currency: 'CNY',
      totalAmount: round2(expenses.reduce((sum, expense) => sum + expense.amount, 0)),
      perMember,
      transfers: settleTransfers(perMember)
    };
  }

  private async getById(tripId: number, expenseId: number, manager?: DataSource['manager']): Promise<ExpenseView> {
    const repo = manager ? manager.getRepository(ExpenseEntity) : this.expenses;
    const expense = await repo.findOne({ where: { id: expenseId, tripId } });
    if (!expense) throw new AppException(ERROR_CODES.EXPENSE_NOT_FOUND, '支出不存在', 404);
    return this.assembleView(expense, manager);
  }

  private async assembleView(expense: ExpenseEntity, manager?: DataSource['manager']): Promise<ExpenseView> {
    const repo = manager ? manager.getRepository(ExpenseShareEntity) : this.shares;
    const shareRows = await repo.find({ where: { expenseId: expense.id }, order: { id: 'ASC' } });
    return {
      id: expense.id,
      tripId: expense.tripId,
      payerId: expense.payerId,
      amount: expense.amount,
      description: expense.description,
      createdAt: expense.createdAt,
      participants: shareRows.map(row => ({ userId: row.userId, shareAmount: row.shareAmount }))
    };
  }
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
