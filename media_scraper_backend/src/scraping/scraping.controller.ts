import { Controller, Post, Body, Get, Query, UseGuards, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScrapingService } from './scraping.service';
import { OptimizedScrapingService } from './optimized-scraping.service';
import { ScrapingEventService } from './scraping.event.service';
import { SessionGuard } from '../core/session-context/session.guard';
import { ConcurrencyLimiterService } from '../core/scaling/concurrency-limiter.service';
import { CLEAR_DOCS, SCRAPE_DOCS, STATUS_DOCS } from './scraping.docs';
import { CurrentSession } from 'src/core/session-context/current-session.decorator';

@ApiTags('Scraping')
@Controller('scrape')
export class ScrapingController {
  constructor(
    @InjectQueue('scrape-queue') private readonly scrapeQueue: Queue,
    private readonly scrapingService: ScrapingService,
    private readonly optimizedService: OptimizedScrapingService,
    private readonly eventService: ScrapingEventService,
    private readonly concurrencyLimiter: ConcurrencyLimiterService,
  ) {}

  @Post('concurrency')
  setConcurrency(@Body('limit') limit: number) {
    this.concurrencyLimiter.setLimit(limit);
    return { status: 'success', limit };
  }

  @Get('status')
  @ApiOperation({
    summary: STATUS_DOCS.summary,
    description: STATUS_DOCS.description,
  })
  async getStatus() {
    const counts = await this.scrapeQueue.getJobCounts();
    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }

  @Get('system-status')
  @ApiOperation({
    summary: 'System Performance Status',
    description:
      'Get real-time system performance metrics, scaling status, and circuit breaker information',
  })
  @ApiResponse({
    status: 200,
    description: 'System status with scaling metrics',
    example: {
      system: { cpu: '45%', memory: '62%', health: 'healthy' },
      concurrency: { current: '2/4', utilization: '50%', waiting: 0 },
      strategies: { circuitBreakers: [], failureRate: '0%' },
      recommendation: 'System operating normally',
    },
  })
  async getSystemStatus(@Query('mode') mode?: 'optimized' | 'full') {
    if (mode === 'optimized') {
      return this.optimizedService.getSystemStatus();
    }
    return this.scrapingService.getSystemStatus();
  }

  @Post('performance-mode')
  @ApiOperation({
    summary: 'Switch Performance Mode',
    description:
      'Switch between lightweight mode (zero overhead) and normal mode (full monitoring)',
  })
  async setPerformanceMode(@Body() body: { mode: 'lightweight' | 'normal' }) {
    if (body.mode === 'lightweight') {
      this.optimizedService.enableLightweightMode();
      return {
        message: 'Lightweight mode enabled - monitoring disabled for maximum performance',
        overhead: 'zero',
        features: 'basic scaling only',
      };
    } else {
      this.optimizedService.enableNormalMode();
      return {
        message: 'Normal mode enabled - full monitoring and scaling active',
        overhead: 'minimal',
        features: 'full scaling with monitoring',
      };
    }
  }

  @Get('performance-comparison')
  @ApiOperation({
    summary: 'Performance Comparison',
    description: 'Compare overhead between optimized and full monitoring systems',
  })
  async getPerformanceComparison() {
    const optimizedStatus = await this.optimizedService.getSystemStatus();
    const fullStatus = await this.scrapingService.getSystemStatus();

    return {
      optimized: {
        ...optimizedStatus,
        description: 'Zero-overhead monitoring with cached metrics',
      },
      full: {
        ...fullStatus,
        description: 'Full monitoring with real-time calculations',
      },
      recommendation: 'Use optimized mode for production, full mode for debugging',
    };
  }

  @Post('clear')
  @ApiOperation({
    summary: CLEAR_DOCS.summary,
    description: CLEAR_DOCS.description,
  })
  async clearQueue() {
    await this.scrapeQueue.drain();
    await this.scrapeQueue.clean(0, 0, 'completed');
    await this.scrapeQueue.clean(0, 0, 'failed');
    return { message: 'Queue cleared' };
  }

  @Sse('events')
  @ApiOperation({ summary: 'Realtime Job Updates (SSE)' })
  events(@Query('sessionId') querySessionId: string): Observable<MessageEvent> {
    console.log(`SSE Connection attempt: ${querySessionId}`);
    if (!querySessionId) {
      return new Observable((observer) => {
        observer.error(new Error('sessionId query param required'));
        observer.complete();
      }) as any;
    }
    return this.eventService.subscribe(querySessionId);
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiOperation({
    summary: SCRAPE_DOCS.summary,
    description: SCRAPE_DOCS.description,
  })
  @ApiHeader({ name: 'x-session-id', required: true, description: 'Guest Session ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Requests accepted and queued.' })
  async scrape(@Body() body: ScrapeRequestDto, @CurrentSession() sessionId: string) {
    if (!body.urls || !Array.isArray(body.urls)) {
      return { error: 'Invalid body, expected { urls: [] }' };
    }

    const jobs = body.urls.map((url) => ({
      name: 'scrape-job',
      data: { url, sessionId },
    }));

    await this.scrapeQueue.addBulk(jobs);

    return {
      message: 'Request accepted',
      jobCount: jobs.length,
    };
  }
}
