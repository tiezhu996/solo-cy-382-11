import { Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AuthRequest } from '../../common/types/auth-request';
import { TripMemberService } from './trip-member.service';

@Controller('api/trips/:tripId/members')
@UseGuards(JwtGuard)
export class TripMemberController {
  constructor(private readonly members: TripMemberService) {}

  @Post('join')
  async join(@Param('tripId', ParseIntPipe) tripId: number, @Req() req: AuthRequest) {
    return this.members.join(tripId, req.user.userId);
  }

  @Get()
  async list(@Param('tripId', ParseIntPipe) tripId: number, @Req() req: AuthRequest) {
    await this.members.assertMember(tripId, req.user.userId);
    return this.members.listMembers(tripId);
  }
}
