import { api } from '../api';
import type { TripItem, TripMemberView } from '../types';

export interface CreateTripPayload {
  ownerId: number;
  destination: string;
  departDate: string;
  days: number;
  budgetMax?: number;
  transport: string;
  companionCount: number;
}

/** 行程与行程成员相关接口。 */
export const tripApi = {
  list(): Promise<TripItem[]> {
    return api<TripItem[]>('/trips');
  },

  create(payload: CreateTripPayload): Promise<TripItem> {
    return api<TripItem>('/trips', { method: 'POST', body: JSON.stringify(payload) });
  },

  join(tripId: number): Promise<TripMemberView> {
    return api<TripMemberView>(`/trips/${tripId}/members/join`, { method: 'POST' });
  },

  members(tripId: number): Promise<TripMemberView[]> {
    return api<TripMemberView[]>(`/trips/${tripId}/members`);
  }
};
