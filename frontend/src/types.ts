/** 与后端共同支出接口对应的前端类型。 */

export interface AuthUser {
  id: number;
  nickname: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface TripItem {
  id: number;
  ownerId: number;
  destination: string;
  departDate: string;
  days: number;
  transport?: string;
  status?: string;
}

export interface TripMemberView {
  userId: number;
  nickname: string;
  joinedAt: string;
}

export interface ExpenseParticipant {
  userId: number;
  shareAmount: number;
}

export interface ExpenseView {
  id: number;
  tripId: number;
  payerId: number;
  amount: number;
  description: string;
  createdAt: string;
  participants: ExpenseParticipant[];
}

export interface MemberBalance {
  userId: number;
  nickname: string;
  paid: number;
  owed: number;
  net: number;
}

export interface Transfer {
  fromUserId: number;
  fromNickname: string;
  toUserId: number;
  toNickname: string;
  amount: number;
}

export interface SettlementView {
  tripId: number;
  currency: string;
  totalAmount: number;
  perMember: MemberBalance[];
  transfers: Transfer[];
}

export interface CreateExpensePayload {
  payerId: number;
  participantIds: number[];
  amount: number;
  description?: string;
}
