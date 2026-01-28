import { Injectable, Logger } from '@nestjs/common';
import { ResourceMonitorService } from './resource-monitor.service';
import { CircuitBreakerService } from './circuit-breaker.service';

export enum StrategyMode {
  FULL_FEATURES = 'full_features',
  NO_STEALTH = 'no_stealth',
  CHEERIO_ONLY = 'cheerio_only',
  EMERGENCY = 'emergency',
}

export interface StrategySelection {
  availableStrategies: string[];
  mode: StrategyMode;
  reasoning: string;
  estimatedMemory: number;
  expectedDuration: number;
}

interface StrategyProfile {
  memoryUsage: number;
  cpuIntensity: number;
  avgDuration: number;
  successRate: number;
  reliability: number;
}

@Injectable()
export class StrategySelectorService {
  private readonly logger = new Logger(StrategySelectorService.name);

  private readonly strategyProfiles: Record<string, StrategyProfile> = {
    YouTube: {
      memoryUsage: 5,
      cpuIntensity: 2,
      avgDuration: 3,
      successRate: 0.95,
      reliability: 9,
    },
    Cheerio: {
      memoryUsage: 2,
      cpuIntensity: 1,
      avgDuration: 2,
      successRate: 0.7,
      reliability: 8,
    },
    Puppeteer: {
      memoryUsage: 200,
      cpuIntensity: 7,
      avgDuration: 15,
      successRate: 0.85,
      reliability: 6,
    },
    'Stealth Puppeteer': {
      memoryUsage: 300,
      cpuIntensity: 9,
      avgDuration: 25,
      successRate: 0.9,
      reliability: 7,
    },
  };

  constructor(
    private readonly resourceMonitor: ResourceMonitorService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async selectOptimalStrategies(url: string): Promise<StrategySelection> {
    const metrics = await this.resourceMonitor.getCurrentMetrics();
    const mode = this.determineOperatingMode(metrics);

    const strategies: string[] = [];
    if (this.isYouTubeUrl(url)) {
      if (this.circuitBreaker.isStrategyAvailable('YouTube')) {
        strategies.push('YouTube');
      }
    }

    switch (mode) {
      case StrategyMode.FULL_FEATURES:
        this.addIfAvailable(strategies, 'Cheerio');
        break;

      case StrategyMode.NO_STEALTH:
        this.addIfAvailable(strategies, 'Cheerio');
        break;

      case StrategyMode.CHEERIO_ONLY:
        this.addIfAvailable(strategies, 'Cheerio');
        break;

      case StrategyMode.EMERGENCY:
        this.addIfAvailable(strategies, 'Cheerio');
        break;
    }

    const reasoning = this.generateReasoning(mode, metrics, strategies);
    const estimatedMemory = this.calculateEstimatedMemory(strategies);
    const expectedDuration = this.calculateExpectedDuration(strategies);

    return {
      availableStrategies: strategies,
      mode,
      reasoning,
      estimatedMemory,
      expectedDuration,
    };
  }

  private determineOperatingMode(metrics: any): StrategyMode {
    const { cpuUsage, memoryUsage, systemHealth, shouldShed } = metrics;

    if (shouldShed || systemHealth === 'critical') {
      return StrategyMode.EMERGENCY;
    }

    if (cpuUsage > 85 || memoryUsage > 90) {
      return StrategyMode.CHEERIO_ONLY;
    }

    if (cpuUsage > 70 || memoryUsage > 80) {
      return StrategyMode.NO_STEALTH;
    }

    return StrategyMode.FULL_FEATURES;
  }

  private addIfAvailable(strategies: string[], strategyName: string): void {
    if (strategyName === 'Cheerio' || this.circuitBreaker.isStrategyAvailable(strategyName)) {
      strategies.push(strategyName);
    } else {
      this.logger.warn(`Strategy ${strategyName} unavailable due to circuit breaker`);
    }
  }

  private isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com|youtu\.be)/i.test(url);
  }

  private generateReasoning(mode: StrategyMode, metrics: any, _strategies: string[]): string {
    const reasons: string[] = [];

    switch (mode) {
      case StrategyMode.EMERGENCY:
        reasons.push(`System critical (CPU: ${metrics.cpuUsage}%, Mem: ${metrics.memoryUsage}%)`);
        break;
      case StrategyMode.CHEERIO_ONLY:
        reasons.push(`High resource usage, using lightweight strategies only`);
        break;
      case StrategyMode.NO_STEALTH:
        reasons.push(`Moderate load, excluding heavy stealth strategy`);
        break;
      case StrategyMode.FULL_FEATURES:
        reasons.push(`System healthy, all strategies available`);
        break;
    }

    const unavailableStrategies = ['Cheerio', 'Puppeteer', 'Stealth Puppeteer', 'YouTube'].filter(
      (s) => !this.circuitBreaker.isStrategyAvailable(s),
    );

    if (unavailableStrategies.length > 0) {
      reasons.push(`Circuit breakers: ${unavailableStrategies.join(', ')}`);
    }

    return reasons.join(' | ');
  }

  private calculateEstimatedMemory(strategies: string[]): number {
    return strategies.reduce((total, strategy) => {
      const profile = this.strategyProfiles[strategy];
      return total + (profile ? profile.memoryUsage : 50);
    }, 0);
  }

  private calculateExpectedDuration(strategies: string[]): number {
    // Use the duration of the first strategy (most likely to succeed)
    if (strategies.length === 0) return 0;

    const firstStrategy = strategies[0];
    const profile = this.strategyProfiles[firstStrategy];
    return profile ? profile.avgDuration : 10;
  }

  async shouldAcceptRequest(queueLength: number): Promise<{ accept: boolean; reason: string }> {
    const metrics = await this.resourceMonitor.getCurrentMetrics();

    // Immediate rejection conditions (Google-style load shedding)
    // Immediate rejection conditions (Google-style load shedding)
    // if (metrics.shouldShed) {
    //   return { accept: false, reason: 'System overloaded - load shedding active' };
    // }

    // USER REQUEST: Infinite queueing.
    // if (queueLength > 100) {
    //   return { accept: false, reason: 'Queue overflow - too many pending requests' };
    // }

    // USER REQUEST: Never reject requests based on system health.
    // if (metrics.systemHealth === 'critical') {
    //   return { accept: false, reason: 'System health critical' };
    // }

    // Check recent failure rate
    const recentFailures = this.getRecentFailureRate();
    // USER REQUEST: Infinite queueing (ignore failure rate).
    // if (recentFailures > 50) {
    //   return { accept: false, reason: 'High failure rate - system unstable' };
    // }

    return { accept: true, reason: 'System healthy - request accepted' };
  }

  private getRecentFailureRate(): number {
    const allStats = this.circuitBreaker.getAllStats();
    const totalStrategies = allStats.length;
    const failingStrategies = allStats.filter((s) => s.state === 'open').length;

    return totalStrategies > 0 ? (failingStrategies / totalStrategies) * 100 : 0;
  }

  getSystemStatus() {
    return {
      strategyProfiles: this.strategyProfiles,
      circuitBreakers: this.circuitBreaker.getAllStats(),
      recentFailureRate: this.getRecentFailureRate(),
    };
  }
}
