import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** 行程成员关系：决定谁可以参与该行程的共同支出。 */
@Entity('trip_members')
@Unique('uq_trip_member', ['tripId', 'userId'])
@Index('idx_trip_members_user', ['userId'])
export class TripMemberEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'trip_id' }) tripId!: number;
  @Column({ name: 'user_id' }) userId!: number;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt!: Date;
}
