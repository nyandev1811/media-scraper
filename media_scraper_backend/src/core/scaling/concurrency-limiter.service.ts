import { Injectable, Logger } from '@nestjs/common';
import { ResourceMonitorService, ResourceMetrics } from './resource-monitor.service';

export class ConcurrencyLimitError extends Error {
  constructor(current: number, limit: number) {
    super(`Concurrency limit reached: ${current}/${limit} active operations`);
    this.name = 'ConcurrencyLimitError';
  }
}

interface ConcurrencyConfig {
  minConcurrency: number;
  maxConcurrency: number;
  scaleUpCpuThreshold: number;
  scaleUpMemoryThreshold: number;
  scaleDownCpuThreshold: number;
  scaleDownMemoryThreshold: number;
  adjustmentCooldown: number;
}

@Injectable()
export class ConcurrencyLimiterService {
  private readonly logger = new Logger(ConcurrencyLimiterService.name);
  private currentLimit: number;
  private activeTasks = 0;
  private waitingTasks: (() => void)[] = [];
  private lastAdjustment = 0;

  private readonly config: ConcurrencyConfig = {
    minConcurrency: 1,
    maxConcurrency: 5,
    scaleUpCpuThreshold: 60,
    scaleUpMemoryThreshold: 70,
    scaleDownCpuThreshold: 80,
    scaleDownMemoryThreshold: 85,
    adjustmentCooldown: 10000,
  };

  constructor(private readonly resourceMonitor: ResourceMonitorService) {
    this.currentLimit = 4;
  }

  setLimit(limit: number): void {
    const validLimit = Math.max(1, Math.min(20, limit)); // Safety bounds 1-20
    this.currentLimit = validLimit;
    this.logger.log(`Concurrency limit manually set to ${this.currentLimit}`);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireSlot();

    try {
      this.resourceMonitor.incrementActiveProcesses();
      return await operation();
    } finally {
      this.resourceMonitor.decrementActiveProcesses();
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.activeTasks < this.currentLimit) {
        this.activeTasks++;
        resolve();
      } else {
        if (this.waitingTasks.length > 50) {
          reject(new ConcurrencyLimitError(this.activeTasks, this.currentLimit));
          return;
        }

        this.waitingTasks.push(() => {
          this.activeTasks++;
          resolve();
        });
      }
    });
  }

  private releaseSlot(): void {
    if (this.waitingTasks.length > 0) {
      const nextTask = this.waitingTasks.shift()!;
      nextTask();
    } else {
      this.activeTasks--;
    }
  }

  private async autoAdjustConcurrency(): Promise<void> {
    return;
  }

  private calculateOptimalConcurrency(metrics: ResourceMetrics): number {
    const { cpuUsage, memoryUsage, systemHealth, recommendedConcurrency } = metrics;

    if (systemHealth === 'critical') {
      return this.config.minConcurrency;
    }

    let optimalLimit = Math.min(recommendedConcurrency, this.currentLimit);

    const canScaleUp =
      cpuUsage < this.config.scaleUpCpuThreshold &&
      memoryUsage < this.config.scaleUpMemoryThreshold &&
      this.waitingTasks.length > 0 &&
      this.resourceMonitor.isSystemStable();

    if (canScaleUp) {
      optimalLimit = Math.min(this.config.maxConcurrency, this.currentLimit + 1);
    }

    const shouldScaleDown =
      cpuUsage > this.config.scaleDownCpuThreshold ||
      memoryUsage > this.config.scaleDownMemoryThreshold ||
      !this.resourceMonitor.isSystemStable();

    if (shouldScaleDown) {
      optimalLimit = Math.max(this.config.minConcurrency, this.currentLimit - 1);
    }

    return optimalLimit;
  }

  private processWaitingTasks(): void {
    const slotsAvailable = this.currentLimit - this.activeTasks;
    const tasksToProcess = Math.min(slotsAvailable, this.waitingTasks.length);

    for (let i = 0; i < tasksToProcess; i++) {
      const task = this.waitingTasks.shift();
      if (task) {
        task();
      }
    }
  }

  getCurrentStatus() {
    return {
      currentLimit: this.currentLimit,
      activeTasks: this.activeTasks,
      waitingTasks: this.waitingTasks.length,
      utilizationPercent: Math.round((this.activeTasks / this.currentLimit) * 100),
      canAcceptMore: this.activeTasks < this.currentLimit,
      config: this.config,
    };
  }

  // Manual overrides for testing/debugging
  setMinConcurrency(min: number): void {
    this.config.minConcurrency = Math.max(1, min);
    this.currentLimit = Math.max(this.config.minConcurrency, this.currentLimit);
  }

  setMaxConcurrency(max: number): void {
    this.config.maxConcurrency = Math.max(this.config.minConcurrency, max);
    this.currentLimit = Math.min(this.config.maxConcurrency, this.currentLimit);
  }

  forceLimit(limit: number): void {
    this.currentLimit = Math.max(
      this.config.minConcurrency,
      Math.min(this.config.maxConcurrency, limit),
    );
    this.logger.warn(`Concurrency manually set to ${this.currentLimit}`);
  }
}
