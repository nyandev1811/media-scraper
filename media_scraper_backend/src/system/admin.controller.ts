import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemService } from './system.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly systemService: SystemService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Admin Dashboard Data',
    description: 'Get comprehensive system metrics for admin dashboard',
  })
  async getDashboard() {
    // Use full metrics for dashboard, but cache for 10 seconds
    return await this.systemService.getMetrics();
  }

  @Get('events')
  @ApiOperation({
    summary: 'Server-Sent Events Stream',
    description: 'Real-time system metrics via SSE for admin dashboard',
  })
  async streamEvents() {
    return {
      message: 'SSE disabled - use /admin/dashboard for polling',
      polling_interval: 5000,
    };
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Quick Health Check',
    description: 'Lightweight health status for monitoring',
  })
  async healthCheck() {
    const metrics = await this.systemService.getMetrics();
    return {
      status: metrics.health.status,
      timestamp: metrics.timestamp,
      alerts: metrics.health.alerts,
      quick_metrics: {
        cpu: metrics.health.metrics.cpu,
        memory: metrics.health.metrics.memory,
        active_jobs: metrics.queue.active,
        queue_waiting: metrics.queue.waiting,
      },
    };
  }
}
