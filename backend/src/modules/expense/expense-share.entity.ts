import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from './decimal.transformer';

/** 支出分摊明细：某位成员在某笔支出中应承担的金额，写入后即可回读结算。 */
@Entity('expense_shares')
@Index('idx_expense_shares_trip_user', ['tripId', 'userId'])
export class ExpenseShareEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'expense_id' }) expenseId!: number;
  @Column({ name: 'trip_id' }) tripId!: number;
  @Column({ name: 'user_id' }) userId!: number;
  @Column('decimal', { name: 'share_amount', precision: 10, scale: 2, transformer: new DecimalColumnTransformer() })
  shareAmount!: number;
}
