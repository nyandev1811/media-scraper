import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as os from 'os';

export interface LightweightMetrics {
  cpuUsage: number;
  memoryUsage: number;
  freeMemory: number;
  activeProcesses: number;
  recommendedConcurrency: number;
  shouldShed: boolean;
  timestamp: number;
}

@Injectable()
export class LightweightMonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(LightweightMonitorService.name);

  // Cached metrics - updated in background
  private cachedMetrics: LightweightMetrics;
  private lastUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  private readonly MAX_CONCURRENCY = 5;
  private readonly MEMORY_PER_INSTANCE = 300; // MB

  // Simple counters - no complex objects
  private activeProcesses = 0;

  // Background update timer
  private updateTimer: NodeJS.Timeout | null = null;
  private isEnabled = true;

  constructor() {
    // Initialize with static values
    this.cachedMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      freeMemory: 1024,
      activeProcesses: 0,
      recommendedConcurrency: 2,
      shouldShed: false,
      timestamp: Date.now(),
    };

    // Start background monitoring only if enabled
    if (this.isEnabled) {
      this.startBackgroundMonitoring();
    }
  }

  // MAIN API - Super fast, always cached
  getCurrentMetrics(): LightweightMetrics {
    const now = Date.now();

    // Return cached if still fresh
    if (now - this.lastUpdate < this.CACHE_TTL) {
      return {
        ...this.cachedMetrics,
        activeProcesses: this.activeProcesses,
        timestamp: now,
      };
    }

    // If cache expired, trigger async update but return stale data immediately
    this.updateMetricsAsync();

    return {
      ...this.cachedMetrics,
      activeProcesses: this.activeProcesses,
      timestamp: now,
    };
  }

  // Ultra-fast process tracking
  incrementActiveProcesses(): void {
    this.activeProcesses++;
  }

  decrementActiveProcesses(): void {
    this.activeProcesses = Math.max(0, this.activeProcesses - 1);
  }

  // Simple health check - no complex calculations
  isSystemHealthy(): boolean {
    return (
      !this.cachedMetrics.shouldShed &&
      this.cachedMetrics.cpuUsage < 85 &&
      this.cachedMetrics.memoryUsage < 90
    );
  }

  // Get recommendation without expensive calculations
  getRecommendedConcurrency(): number {
    return this.cachedMetrics.recommendedConcurrency;
  }

  // Background monitoring - runs async, never blocks
  private startBackgroundMonitoring(): void {
    this.updateTimer = setInterval(() => {
      this.updateMetricsAsync().catch((error) => {
        this.logger.error(`Background monitoring error: ${error.message}`);
      });
    }, this.CACHE_TTL);

    this.logger.log('Background monitoring started (5s interval)');
  }

  // Async update - never blocks main thread
  private async updateMetricsAsync(): Promise<void> {
    try {
      // Use process.nextTick to not block current execution
      process.nextTick(() => {
        this.updateMetricsSync();
      });
    } catch (error) {
      // Fail silently - monitoring should never crash main app
      this.logger.warn(`Metrics update failed: ${error.message}`);
    }
  }

  // Sync update - only called from background
  private updateMetricsSync(): void {
    const now = Date.now();

    try {
      // Fast OS calls
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const cpuLoad = os.loadavg()[0]; // Only first load average

      // Quick calculations
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      const cpuUsage = (cpuLoad / os.cpus().length) * 100;

      // Simple concurrency calculation
      const availableMB = (freeMem / 1024 / 1024) * 0.8; // 80% of free memory
      const recommendedConcurrency = Math.max(
        1,
        Math.min(this.MAX_CONCURRENCY, Math.floor(availableMB / this.MEMORY_PER_INSTANCE)),
      );

      // Simple load shedding decision
      const shouldShed = cpuUsage > 85 || memoryUsage > 90;

      // Update cache atomically
      this.cachedMetrics = {
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        freeMemory: Math.round(freeMem / 1024 / 1024),
        activeProcesses: this.activeProcesses,
        recommendedConcurrency,
        shouldShed,
        timestamp: now,
      };

      this.lastUpdate = now;
    } catch (error) {
      // Keep old metrics on error - never crash
      this.logger.warn(`Failed to update metrics: ${error.message}`);
    }
  }

  // Disable monitoring completely for production
  disableMonitoring(): void {
    this.isEnabled = false;
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.logger.log('Monitoring disabled for maximum performance');
  }

  // Enable monitoring
  enableMonitoring(): void {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this.startBackgroundMonitoring();
    }
  }

  // Get simple stats for debugging
  getMonitoringStats(): {
    enabled: boolean;
    cacheAge: number;
    lastUpdate: number;
    activeProcesses: number;
  } {
    return {
      enabled: this.isEnabled,
      cacheAge: Date.now() - this.lastUpdate,
      lastUpdate: this.lastUpdate,
      activeProcesses: this.activeProcesses,
    };
  }

  // Cleanup on module destroy
  onModuleDestroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.logger.log('Lightweight monitor destroyed');
  }
}
