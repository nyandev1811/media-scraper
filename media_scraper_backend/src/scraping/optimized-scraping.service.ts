import { Injectable, Logger } from '@nestjs/common';
import { IScraperStrategy } from './strategies/scraper-strategy.interface';
import { Media } from '../core/entities/media.entity';
import { CheerioScraperStrategy } from './strategies/cheerio.strategy';
import { PuppeteerScraperStrategy } from './strategies/puppeteer.strategy';
import { YouTubeScraperStrategy } from './strategies/youtube.strategy';
import { StealthPuppeteerStrategy } from './strategies/stealth-puppeteer.strategy';
import { LightweightMonitorService } from '../core/scaling/lightweight-monitor.service';
import { SimpleLimiterService } from '../core/scaling/simple-limiter.service';
import { SimpleCircuitBreakerService } from '../core/scaling/simple-circuit-breaker.service';

interface StrategyConfig {
  strategy: IScraperStrategy;
  priority: number;
  name: string;
}

@Injectable()
export class OptimizedScrapingService {
  private readonly logger = new Logger(OptimizedScrapingService.name);
  private strategies: StrategyConfig[];

  constructor(
    private readonly cheerioStrategy: CheerioScraperStrategy,
    private readonly puppeteerStrategy: PuppeteerScraperStrategy,
    private readonly youtubeStrategy: YouTubeScraperStrategy,
    private readonly stealthStrategy: StealthPuppeteerStrategy,
    private readonly monitor: LightweightMonitorService,
    private readonly limiter: SimpleLimiterService,
    private readonly circuitBreaker: SimpleCircuitBreakerService,
  ) {
    this.strategies = [
      { strategy: this.youtubeStrategy, priority: 1, name: 'YouTube' },
      { strategy: this.cheerioStrategy, priority: 2, name: 'Cheerio' },
      // { strategy: this.puppeteerStrategy, priority: 3, name: 'Puppeteer' },
      // { strategy: this.stealthStrategy, priority: 4, name: 'Stealth' },
    ];
  }

  async scrape(url: string, queueLength = 0): Promise<Partial<Media>[]> {
    if (this.shouldRejectRequest(queueLength)) {
      throw new Error('System overloaded - request rejected');
    }

    return this.limiter.execute(async () => {
      return this.executeStrategies(url);
    });
  }

  private shouldRejectRequest(queueLength: number): boolean {
    if (queueLength > 50) return true;

    const metrics = this.monitor.getCurrentMetrics();
    return metrics.shouldShed;
  }

  private async executeStrategies(url: string): Promise<Partial<Media>[]> {
    if (this.isYouTubeUrl(url)) {
      const result = await this.tryStrategy('YouTube', this.youtubeStrategy, url);
      if (result.length > 0) return result;
    }
    const availableStrategies = this.getAvailableStrategies(url);

    for (const config of availableStrategies) {
      if (config.name === 'YouTube') continue;

      const result = await this.tryStrategy(config.name, config.strategy, url);
      if (result.length > 0) {
        return result;
      }
    }

    return [];
  }

  private async tryStrategy(
    name: string,
    strategy: IScraperStrategy,
    url: string,
  ): Promise<Partial<Media>[]> {
    try {
      return await this.circuitBreaker.execute(name, async () => {
        const startTime = Date.now();
        const results = await strategy.scrape(url);
        const duration = Date.now() - startTime;

        if (results && results.length > 0) {
          this.logger.log(`${name}: ${results.length} items (${duration}ms)`);
          return results;
        }

        this.logger.warn(`${name}: no results (${duration}ms)`);
        return [];
      });
    } catch (error) {
      this.logger.error(`${name}: ${error.message}`);
      return [];
    }
  }

  private getAvailableStrategies(url: string): StrategyConfig[] {
    const metrics = this.monitor.getCurrentMetrics();

    if (metrics.shouldShed) {
      return this.strategies.filter((s) => s.name === 'Cheerio' || s.name === 'YouTube');
    }

    if (metrics.cpuUsage > 80 || metrics.memoryUsage > 85) {
      return this.strategies.filter((s) => s.name !== 'Stealth');
    }

    return this.strategies.filter((s) => this.circuitBreaker.isStrategyAvailable(s.name));
  }

  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  async getSystemStatus() {
    const metrics = this.monitor.getCurrentMetrics();
    const limiterStatus = this.limiter.getStatus();
    const circuitStatus = this.circuitBreaker.getStatus();
    const monitorStats = this.monitor.getMonitoringStats();

    return {
      system: {
        cpu: `${metrics.cpuUsage}%`,
        memory: `${metrics.memoryUsage}%`,
        healthy: this.monitor.isSystemHealthy(),
        loadShedding: metrics.shouldShed,
        cacheAge: `${monitorStats.cacheAge}ms`,
      },
      concurrency: {
        active: limiterStatus.activeTasks,
        limit: limiterStatus.currentLimit,
        waiting: limiterStatus.waitingTasks,
        utilization: `${limiterStatus.utilizationPercent}%`,
      },
      strategies: circuitStatus.map((s) => ({
        name: s.strategy,
        available: s.available,
        failures: s.failures,
      })),
      performance: {
        monitoring: monitorStats.enabled ? 'enabled' : 'disabled',
        overhead: 'minimal',
      },
    };
  }

  enableLightweightMode(): void {
    this.monitor.disableMonitoring();
    this.logger.log('Ultra-lightweight mode enabled - monitoring disabled');
  }

  enableNormalMode(): void {
    this.monitor.enableMonitoring();
    this.logger.log('Normal mode enabled - monitoring active');
  }
}
