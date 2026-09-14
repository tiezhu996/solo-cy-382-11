import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from './decimal.transformer';

/** 行程共同支出：一笔由某成员垫付、由若干成员分摊的费用。 */
@Entity('expenses')
@Index('idx_expenses_trip', ['tripId'])
export class ExpenseEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'trip_id' }) tripId!: number;
  @Column({ name: 'payer_id' }) payerId!: number;
  @Column('decimal', { name: 'amount', precision: 10, scale: 2, transformer: new DecimalColumnTransformer() })
  amount!: number;
  @Column({ length: 255, default: '' }) description!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
