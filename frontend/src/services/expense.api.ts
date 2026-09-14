import { api } from '../api';
import type { CreateExpensePayload, ExpenseView, SettlementView } from '../types';

/** 行程共同支出相关接口：新增、列表、单笔回读、结算结果。 */
export const expenseApi = {
  create(tripId: number, payload: CreateExpensePayload): Promise<ExpenseView> {
    return api<ExpenseView>(`/trips/${tripId}/expenses`, { method: 'POST', body: JSON.stringify(payload) });
  },

  list(tripId: number): Promise<ExpenseView[]> {
    return api<ExpenseView[]>(`/trips/${tripId}/expenses`);
  },

  detail(tripId: number, expenseId: number): Promise<ExpenseView> {
    return api<ExpenseView>(`/trips/${tripId}/expenses/${expenseId}`);
  },

  settlement(tripId: number): Promise<SettlementView> {
    return api<SettlementView>(`/trips/${tripId}/expenses/settlement`);
  }
};
