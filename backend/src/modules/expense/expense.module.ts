import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TripEntity } from '../trip/trip.entity';
import { UserEntity } from '../user/user.entity';
import { TripMemberEntity } from './trip-member.entity';
import { ExpenseEntity } from './expense.entity';
import { ExpenseShareEntity } from './expense-share.entity';
import { TripMemberService } from './trip-member.service';
import { TripMemberController } from './trip-member.controller';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripMemberEntity, ExpenseEntity, ExpenseShareEntity, TripEntity, UserEntity]),
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev_secret' })
  ],
  controllers: [TripMemberController, ExpenseController],
  providers: [TripMemberService, ExpenseService],
  exports: [TripMemberService]
})
export class ExpenseModule {}
