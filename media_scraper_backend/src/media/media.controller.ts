import { Controller, Get, Query, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiHeader } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { MediaFilterDto } from './dto/media-filter.dto';
import { SessionGuard } from '../core/session-context/session.guard';
import { CurrentSession } from '../core/session-context/current-session.decorator';

import { UserService } from '../user/user.service';

import { GET_MEDIA_DOCS, DELETE_SOURCE_DOCS } from './media.docs';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @UseGuards(SessionGuard)
  @ApiOperation({
    summary: GET_MEDIA_DOCS.summary,
    description: GET_MEDIA_DOCS.description,
  })
  @ApiHeader({ name: 'x-session-id', required: true, description: 'Guest Session ID (UUID)' })
  async getMedia(@Query() filter: MediaFilterDto, @CurrentSession() sessionId: string) {
    return await this.mediaService.findAll(filter, sessionId);
  }

  @Delete('source')
  @ApiOperation({
    summary: DELETE_SOURCE_DOCS.summary,
    description: DELETE_SOURCE_DOCS.description,
  })
  @ApiQuery({ name: 'url', required: true })
  @UseGuards(SessionGuard)
  @ApiHeader({ name: 'x-session-id', required: true })
  async deleteMedia(@Query('url') url: string, @CurrentSession() sessionId: string) {
    if (!url || !sessionId) return;
    await this.userService.deleteHistory(sessionId, url);
    return { message: 'Media removed from your history' };
  }
}
