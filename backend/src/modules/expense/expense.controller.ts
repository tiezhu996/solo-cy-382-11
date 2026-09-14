import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AuthRequest } from '../../common/types/auth-request';
import { CreateExpenseInput, ExpenseService } from './expense.service';

@Controller('api/trips/:tripId/expenses')
@UseGuards(JwtGuard)
export class ExpenseController {
  constructor(private readonly expenses: ExpenseService) {}

  @Post()
  create(@Param('tripId', ParseIntPipe) tripId: number, @Req() req: AuthRequest, @Body() body: CreateExpenseInput) {
    return this.expenses.create(tripId, req.user.userId, body);
  }

  @Get()
  list(@Param('tripId', ParseIntPipe) tripId: number, @Req() req: AuthRequest) {
    return this.expenses.list(tripId, req.user.userId);
  }

  @Get('settlement')
  settlement(@Param('tripId', ParseIntPipe) tripId: number, @Req() req: AuthRequest) {
    return this.expenses.settlement(tripId, req.user.userId);
  }

  @Get(':expenseId')
  detail(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Req() req: AuthRequest
  ) {
    return this.expenses.detail(tripId, expenseId, req.user.userId);
  }
}
