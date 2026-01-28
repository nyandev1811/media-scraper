import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { UserService } from './user.service';

import { GET_HISTORY_DOCS } from './user.docs';
import { SessionGuard } from '../core/session-context/session.guard';
import { CurrentSession } from '../core/session-context/current-session.decorator';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('history')
  @UseGuards(SessionGuard)
  @ApiOperation({
    summary: GET_HISTORY_DOCS.summary,
    description: GET_HISTORY_DOCS.description,
  })
  @ApiHeader({ name: 'x-session-id', required: true, description: 'Guest Session ID (UUID)' })
  async getHistory(@CurrentSession() sessionId: string) {
    return await this.userService.getUserHistory(sessionId);
  }
}
