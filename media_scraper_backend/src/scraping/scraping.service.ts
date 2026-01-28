import { Injectable, Logger } from '@nestjs/common';
import { IScraperStrategy } from './strategies/scraper-strategy.interface';
import { Media } from '../core/entities/media.entity';
import { CheerioScraperStrategy } from './strategies/cheerio.strategy';
import { PuppeteerScraperStrategy } from './strategies/puppeteer.strategy';
import { YouTubeScraperStrategy } from './strategies/youtube.strategy';
import { StealthPuppeteerStrategy } from './strategies/stealth-puppeteer.strategy';
import { ResourceMonitorService } from '../core/scaling/resource-monitor.service';
import { CircuitBreakerService } from '../core/scaling/circuit-breaker.service';
import { ConcurrencyLimiterService } from '../core/scaling/concurrency-limiter.service';
import { StrategySelectorService } from '../core/scaling/strategy-selector.service';

interface StrategyConfig {
  strategy: IScraperStrategy;
  priority: number;
  description: string;
  memoryUsage: string;
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private strategyConfigs: StrategyConfig[] = [];

  constructor(
    private readonly cheerioStrategy: CheerioScraperStrategy,
    private readonly puppeteerStrategy: PuppeteerScraperStrategy,
    private readonly youtubeStrategy: YouTubeScraperStrategy,
    private readonly stealthStrategy: StealthPuppeteerStrategy,
    private readonly resourceMonitor: ResourceMonitorService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly concurrencyLimiter: ConcurrencyLimiterService,
    private readonly strategySelector: StrategySelectorService,
  ) {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    this.strategyConfigs = [
      {
        strategy: this.youtubeStrategy,
        priority: 1,
        description: 'YouTube oEmbed API',
        memoryUsage: '~10KB',
      },
      {
        strategy: this.cheerioStrategy,
        priority: 2,
        description: 'HTTP + DOM parsing (fastest)',
        memoryUsage: '~5KB',
      },
    ];

    this.strategyConfigs.forEach((config) => {
      this.logger.log(
        `Registered ${config.strategy.name}: ${config.description} (${config.memoryUsage})`,
      );
    });

    this.logger.log('Fallback chain: YouTube → Cheerio → Puppeteer → Stealth');
  }

  async scrape(url: string, queueLength: number = 0): Promise<Partial<Media>[]> {
    const shouldAccept = await this.strategySelector.shouldAcceptRequest(queueLength);
    if (!shouldAccept.accept) {
      this.logger.warn(`🚫 Request rejected: ${shouldAccept.reason}`);
      throw new Error(`Request rejected: ${shouldAccept.reason}`);
    }
    const strategySelection = await this.strategySelector.selectOptimalStrategies(url);
    this.logger.log(
      `🎯 Strategy selection: ${strategySelection.mode} (${strategySelection.reasoning})`,
    );

    if (strategySelection.availableStrategies.length === 0) {
      throw new Error('No strategies available - system in emergency mode');
    }

    return this.concurrencyLimiter.execute(async () => {
      return this.executeStrategiesWithProtection(url, strategySelection.availableStrategies);
    });
  }

  private async executeStrategiesWithProtection(
    url: string,
    strategyNames: string[],
  ): Promise<Partial<Media>[]> {
    const metrics = await this.resourceMonitor.getCurrentMetrics();
    this.logger.log(
      `📊 System status: CPU ${metrics.cpuUsage}%, Memory ${metrics.memoryUsage}%, ` +
        `Active: ${metrics.activeProcesses}, Health: ${metrics.systemHealth}`,
    );

    for (const strategyName of strategyNames) {
      const strategy = this.getStrategyByName(strategyName);
      if (!strategy) continue;

      try {
        this.logger.log(`🔍 Executing ${strategyName} with circuit breaker protection`);
        const startTime = Date.now();

        const results = await (strategyName === 'Cheerio'
          ? strategy.scrape(url)
          : this.circuitBreaker.execute(strategyName, async () => {
              return strategy.scrape(url);
            }));

        const duration = Date.now() - startTime;

        if (results && results.length > 0) {
          const config = this.strategyConfigs.find((c) => c.strategy.name === strategyName);
          this.logger.log(
            `✅ ${strategyName} succeeded: ${results.length} items (${duration}ms, ${config?.memoryUsage})`,
          );
          return results;
        } else {
          this.logger.warn(`⚠️ ${strategyName} returned no results (${duration}ms)`);
        }
      } catch (error) {
        this.logger.error(`❌ ${strategyName} failed: ${error.message}`);

        // Continue to next strategy unless it's a circuit breaker error
        if (error.name === 'CircuitBreakerError') {
          this.logger.warn(`⚡ Circuit breaker active for ${strategyName}, skipping`);
        }
      }
    }

    this.logger.error(`🚨 All available strategies failed for ${url}`);
    return [];
  }

  private getStrategyByName(name: string): IScraperStrategy | null {
    switch (name) {
      case 'YouTube':
        return this.youtubeStrategy;
      case 'Cheerio':
        return this.cheerioStrategy;
      case 'Puppeteer':
        return this.puppeteerStrategy;
      case 'Stealth Puppeteer':
        return this.stealthStrategy;
      default:
        return null;
    }
  }

  async getSystemStatus() {
    const metrics = await this.resourceMonitor.getCurrentMetrics();
    const concurrencyStatus = this.concurrencyLimiter.getCurrentStatus();
    const strategyStatus = this.strategySelector.getSystemStatus();

    return {
      system: {
        cpu: `${metrics.cpuUsage}%`,
        memory: `${metrics.memoryUsage}%`,
        health: metrics.systemHealth,
        loadShedding: metrics.shouldShed,
      },
      concurrency: {
        current: `${concurrencyStatus.activeTasks}/${concurrencyStatus.currentLimit}`,
        utilization: `${concurrencyStatus.utilizationPercent}%`,
        waiting: concurrencyStatus.waitingTasks,
        canAcceptMore: concurrencyStatus.canAcceptMore,
      },
      strategies: {
        circuitBreakers: strategyStatus.circuitBreakers,
        failureRate: `${strategyStatus.recentFailureRate}%`,
      },
      recommendation: this.getPerformanceRecommendation(metrics, concurrencyStatus),
    };
  }

  private getPerformanceRecommendation(metrics: any, concurrency: any): string {
    if (metrics.shouldShed) return 'System overloaded - consider scaling up';
    if (metrics.systemHealth === 'critical') return 'System critical - reduce load immediately';
    if (concurrency.utilizationPercent > 90) return 'High concurrency - monitor for bottlenecks';
    if (metrics.cpuUsage < 40 && metrics.memoryUsage < 50)
      return 'System underutilized - can handle more load';
    return 'System operating normally';
  }

  private isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com|youtu\.be)/i.test(url);
  }

  private isProtectedSite(url: string): boolean {
    const protectedDomains = [
      'unsplash.com',
      'pinterest.com',
      'instagram.com',
      'facebook.com',
      'twitter.com',
      'linkedin.com',
    ];

    return protectedDomains.some((domain) => url.includes(domain));
  }

  getStrategyInfo(): StrategyConfig[] {
    return this.strategyConfigs.map((config) => ({
      ...config,
      strategy: { name: config.strategy.name } as IScraperStrategy,
    }));
  }
}
