import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScrapingService } from './scraping.service';
import { OptimizedScrapingService } from './optimized-scraping.service';
import { ScrapingEventService } from './scraping.event.service';
import { ScrapingProcessor } from './scraping.processor';
import { ScrapingController } from './scraping.controller';
import { CheerioScraperStrategy } from './strategies/cheerio.strategy';
import { PuppeteerScraperStrategy } from './strategies/puppeteer.strategy';
import { YouTubeScraperStrategy } from './strategies/youtube.strategy';
import { StealthPuppeteerStrategy } from './strategies/stealth-puppeteer.strategy';
import { MediaModule } from '../media/media.module';
import { UserModule } from '../user/user.module';
import { GeminiService } from '../infrastructure/ai/gemini.service';
// Heavy services (for comparison/fallback)
import { ResourceMonitorService } from '../core/scaling/resource-monitor.service';
import { CircuitBreakerService } from '../core/scaling/circuit-breaker.service';
import { ConcurrencyLimiterService } from '../core/scaling/concurrency-limiter.service';
import { StrategySelectorService } from '../core/scaling/strategy-selector.service';
// Lightweight services
import { LightweightMonitorService } from '../core/scaling/lightweight-monitor.service';
import { SimpleLimiterService } from '../core/scaling/simple-limiter.service';
import { SimpleCircuitBreakerService } from '../core/scaling/simple-circuit-breaker.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scrape-queue',
    }),
    MediaModule,
    UserModule,
  ],
  controllers: [ScrapingController],
  providers: [
    // Main services
    ScrapingService,
    OptimizedScrapingService,
    ScrapingProcessor,

    // Strategy implementations
    CheerioScraperStrategy,
    PuppeteerScraperStrategy,
    YouTubeScraperStrategy,
    StealthPuppeteerStrategy,

    GeminiService,

    // Heavy services
    ResourceMonitorService,
    CircuitBreakerService,
    ConcurrencyLimiterService,
    StrategySelectorService,

    // Lightweight services
    LightweightMonitorService,
    SimpleLimiterService,
    SimpleCircuitBreakerService,

    // Event Service
    ScrapingEventService,
  ],
  exports: [
    ScrapingService,
    OptimizedScrapingService,
    LightweightMonitorService,
    ScrapingEventService,
  ],
})
export class ScrapingModule {}
