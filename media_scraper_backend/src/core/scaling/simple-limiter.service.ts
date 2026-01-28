import { Injectable, Logger } from '@nestjs/common';
import { LightweightMonitorService } from './lightweight-monitor.service';

export class ConcurrencyLimitError extends Error {
  constructor() {
    super('System overloaded - request rejected');
    this.name = 'ConcurrencyLimitError';
  }
}

@Injectable()
export class SimpleLimiterService {
  private readonly logger = new Logger(SimpleLimiterService.name);

  // Simple counters - no complex state
  private activeTasks = 0;
  private waitingTasks = 0;
  private currentLimit = 3; // Start conservative

  // Simple thresholds
  private readonly MIN_LIMIT = 1;
  private readonly MAX_LIMIT = 5;
  private readonly MAX_WAITING = 20; // Drop requests if too many waiting

  // Last adjustment time for cooldown
  private lastAdjustment = 0;
  private readonly ADJUSTMENT_COOLDOWN = 10000; // 10 seconds

  constructor(private readonly monitor: LightweightMonitorService) {
    // Auto-adjust every 30 seconds (longer interval = less overhead)
    setInterval(() => this.adjustConcurrency(), 30000);
  }

  // MAIN API - Super fast execution control
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Fast rejection if system overloaded
    if (this.shouldRejectImmediately()) {
      throw new ConcurrencyLimitError();
    }

    // Fast path: if we have capacity, execute immediately
    if (this.activeTasks < this.currentLimit) {
      return this.executeImmediate(operation);
    }

    // Queue if reasonable, reject if too many waiting
    if (this.waitingTasks >= this.MAX_WAITING) {
      throw new ConcurrencyLimitError();
    }

    // Wait for slot with timeout
    return this.executeWithWait(operation);
  }

  // Immediate execution path
  private async executeImmediate<T>(operation: () => Promise<T>): Promise<T> {
    this.activeTasks++;
    this.monitor.incrementActiveProcesses();

    try {
      return await operation();
    } finally {
      this.activeTasks--;
      this.monitor.decrementActiveProcesses();
    }
  }

  // Wait for slot with simple queue
  private async executeWithWait<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.waitingTasks++;

      const timeout = setTimeout(() => {
        this.waitingTasks--;
        reject(new ConcurrencyLimitError());
      }, 5000); // 5 second timeout

      // Check for slot every 100ms (simple polling)
      const checkSlot = () => {
        if (this.activeTasks < this.currentLimit) {
          this.waitingTasks--;
          clearTimeout(timeout);

          this.executeImmediate(operation).then(resolve).catch(reject);
        } else {
          setTimeout(checkSlot, 100);
        }
      };

      checkSlot();
    });
  }

  // Fast rejection logic
  private shouldRejectImmediately(): boolean {
    const metrics = this.monitor.getCurrentMetrics();

    // Reject if system is shedding load
    if (metrics.shouldShed) return true;

    // Reject if too many active tasks
    if (this.activeTasks >= this.MAX_LIMIT) return true;

    // Reject if memory critical
    if (metrics.memoryUsage > 95) return true;

    return false;
  }

  // Simple concurrency adjustment - runs in background
  private adjustConcurrency(): void {
    const now = Date.now();

    // Cooldown check
    if (now - this.lastAdjustment < this.ADJUSTMENT_COOLDOWN) {
      return;
    }

    try {
      const metrics = this.monitor.getCurrentMetrics();
      const newLimit = this.calculateNewLimit(metrics);

      if (newLimit !== this.currentLimit) {
        const oldLimit = this.currentLimit;
        this.currentLimit = newLimit;
        this.lastAdjustment = now;

        this.logger.log(
          `Concurrency: ${oldLimit} → ${newLimit} (CPU: ${metrics.cpuUsage}%, Mem: ${metrics.memoryUsage}%)`,
        );
      }
    } catch (error) {
      // Never crash on adjustment error
      this.logger.warn(`Concurrency adjustment failed: ${error.message}`);
    }
  }

  // Simple limit calculation
  private calculateNewLimit(metrics: any): number {
    // Use recommended concurrency from monitor
    let newLimit = metrics.recommendedConcurrency;

    // Apply simple rules
    if (metrics.shouldShed) {
      newLimit = this.MIN_LIMIT; // Minimum when overloaded
    } else if (metrics.cpuUsage > 80 || metrics.memoryUsage > 85) {
      newLimit = Math.max(this.MIN_LIMIT, this.currentLimit - 1); // Scale down
    } else if (metrics.cpuUsage < 50 && metrics.memoryUsage < 70 && this.waitingTasks > 0) {
      newLimit = Math.min(this.MAX_LIMIT, this.currentLimit + 1); // Scale up
    }

    return Math.max(this.MIN_LIMIT, Math.min(this.MAX_LIMIT, newLimit));
  }

  // Simple status for debugging
  getStatus() {
    return {
      activeTasks: this.activeTasks,
      waitingTasks: this.waitingTasks,
      currentLimit: this.currentLimit,
      utilizationPercent: Math.round((this.activeTasks / this.currentLimit) * 100),
    };
  }

  // Manual overrides for testing
  setLimit(limit: number): void {
    this.currentLimit = Math.max(this.MIN_LIMIT, Math.min(this.MAX_LIMIT, limit));
    this.logger.warn(`Concurrency manually set to ${this.currentLimit}`);
  }
}
