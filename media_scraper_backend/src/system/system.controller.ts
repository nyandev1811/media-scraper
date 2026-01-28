import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemService } from './system.service';

import { SYSTEM_STATUS_DOCS } from './system.docs';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  @ApiOperation({
    summary: SYSTEM_STATUS_DOCS.summary,
    description: SYSTEM_STATUS_DOCS.description,
  })
  async getSystemStatus() {
    return this.systemService.getMetrics();
  }
}
