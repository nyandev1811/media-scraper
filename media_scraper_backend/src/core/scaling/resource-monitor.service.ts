import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  freeMemory: number;
  loadAverage: number[];
  activeProcesses: number;
  shouldShed: boolean;
  recommendedConcurrency: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

@Injectable()
export class ResourceMonitorService {
  private readonly logger = new Logger(ResourceMonitorService.name);
  private readonly MEMORY_PER_PUPPETEER_MB = 300;
  private readonly CPU_THRESHOLD_WARNING = 80;
  private readonly CPU_THRESHOLD_CRITICAL = 95;
  private readonly MEMORY_THRESHOLD_WARNING = 85;
  private readonly MEMORY_THRESHOLD_CRITICAL = 98;

  private activeProcesses = 0;
  private historicalMetrics: ResourceMetrics[] = [];

  async getCurrentMetrics(): Promise<ResourceMetrics> {
    const cpuLoad = os.loadavg();
    const cpuUsage = (cpuLoad[0] / os.cpus().length) * 100;

    let memoryMetrics = await this.getMemoryUsageFromCGroup();

    if (!memoryMetrics) {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = Math.max(0, totalMem - freeMem);
      memoryMetrics = {
        totalMem,
        freeMem,
        usedMem,
        percentage: (usedMem / totalMem) * 100,
      };
    }

    const availableForPuppeteer = memoryMetrics.freeMem * 0.8;
    const recommendedConcurrency = Math.max(
      1,
      Math.min(5, Math.floor(availableForPuppeteer / 1024 / 1024 / this.MEMORY_PER_PUPPETEER_MB)),
    );

    const shouldShed = false;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (
      cpuUsage > this.CPU_THRESHOLD_CRITICAL ||
      memoryMetrics.percentage > this.MEMORY_THRESHOLD_CRITICAL
    ) {
      systemHealth = 'critical';
    } else if (
      cpuUsage > this.CPU_THRESHOLD_WARNING ||
      memoryMetrics.percentage > this.MEMORY_THRESHOLD_WARNING
    ) {
      systemHealth = 'warning';
    }

    const metrics: ResourceMetrics = {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memoryMetrics.percentage * 100) / 100,
      freeMemory: Math.round((memoryMetrics.freeMem / 1024 / 1024) * 100) / 100,
      loadAverage: cpuLoad,
      activeProcesses: this.activeProcesses,
      shouldShed,
      recommendedConcurrency,
      systemHealth,
    };

    this.updateHistory(metrics);
    return metrics;
  }

  private async getMemoryUsageFromCGroup(): Promise<{
    totalMem: number;
    freeMem: number;
    usedMem: number;
    percentage: number;
  } | null> {
    try {
      const fs = require('fs/promises');

      try {
        const usageContent = await fs.readFile('/sys/fs/cgroup/memory.current', 'utf8');
        const maxContent = await fs.readFile('/sys/fs/cgroup/memory.max', 'utf8');

        const usedMem = parseInt(usageContent.trim());
        let totalMem = parseInt(maxContent.trim());

        if (isNaN(totalMem)) {
          totalMem = os.totalmem();
        }

        return {
          totalMem,
          usedMem,
          freeMem: Math.max(0, totalMem - usedMem),
          percentage: (usedMem / totalMem) * 100,
        };
      } catch (e) {}

      try {
        const usageContent = await fs.readFile(
          '/sys/fs/cgroup/memory/memory.usage_in_bytes',
          'utf8',
        );
        const limitContent = await fs.readFile(
          '/sys/fs/cgroup/memory/memory.limit_in_bytes',
          'utf8',
        );

        const usedMem = parseInt(usageContent.trim());
        const totalMem = parseInt(limitContent.trim());

        const safeTotalMem =
          totalMem > 0 && totalMem < 1024 * 1024 * 1024 * 1024 * 1024 ? totalMem : os.totalmem();
        const safeUsedMem = Math.max(0, usedMem);
        const safeFreeMem = Math.max(0, safeTotalMem - safeUsedMem);

        return {
          totalMem: safeTotalMem,
          usedMem: safeUsedMem,
          freeMem: safeFreeMem,
          percentage: safeTotalMem > 0 ? (safeUsedMem / safeTotalMem) * 100 : 0,
        };
      } catch (e) {}

      return null;
    } catch (e) {
      return null;
    }
  }

  incrementActiveProcesses(): void {
    this.activeProcesses++;
  }

  decrementActiveProcesses(): void {
    this.activeProcesses = Math.max(0, this.activeProcesses - 1);
  }

  private updateHistory(metrics: ResourceMetrics): void {
    this.historicalMetrics.push(metrics);
    if (this.historicalMetrics.length > 60) {
      this.historicalMetrics.shift();
    }
  }

  getAverageCpuUsage(minutes: number = 5): number {
    const samples = Math.min(minutes, this.historicalMetrics.length);
    if (samples === 0) return 0;

    const recentMetrics = this.historicalMetrics.slice(-samples);
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / samples;
    return Math.round(avgCpu * 100) / 100;
  }

  isSystemStable(): boolean {
    const recentFailures = this.historicalMetrics
      .slice(-10)
      .filter((m) => m.systemHealth === 'critical').length;

    return recentFailures < 3;
  }
}
