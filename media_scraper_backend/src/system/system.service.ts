import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DockerResourceReader } from '../core/common/docker-resource-reader';

@Injectable()
export class SystemService {
  private readonly MEMORY_PER_INSTANCE_MB = 300;

  constructor(@InjectQueue('scrape-queue') private readonly scrapeQueue: Queue) {}

  async getLightweightMetrics() {
    const memInfo = DockerResourceReader.getMemoryInfo();
    const cpuInfo = DockerResourceReader.getCpuInfo();

    return {
      memory: {
        total: this.formatBytes(memInfo.total),
        used: this.formatBytes(memInfo.used),
        free: this.formatBytes(memInfo.free),
        freePercentage: ((memInfo.free / memInfo.total) * 100).toFixed(2) + '%',
        usedPercentage: memInfo.usedPercent.toFixed(2) + '%',
      },
      cpu: {
        loadAvg1m: cpuInfo.load.toFixed(2),
        cores: cpuInfo.cores,
        utilization: cpuInfo.utilization.toFixed(2) + '%',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getMetrics() {
    const memInfo = DockerResourceReader.getMemoryInfo();
    const cpuInfo = DockerResourceReader.getCpuInfo();
    const cpuLoad = os.loadavg();

    const availableForScraping = memInfo.free * 0.8;
    const recommendedConcurrency = Math.floor(
      availableForScraping / 1024 / 1024 / this.MEMORY_PER_INSTANCE_MB,
    );

    const queueCounts = await this.scrapeQueue.getJobCounts();

    return {
      memory: {
        total: this.formatBytes(memInfo.total),
        used: this.formatBytes(memInfo.used),
        free: this.formatBytes(memInfo.free),
        freePercentage: ((memInfo.free / memInfo.total) * 100).toFixed(2) + '%',
        usedPercentage: memInfo.usedPercent.toFixed(2) + '%',
      },
      cpu: {
        loadAvg1m: cpuLoad[0].toFixed(2),
        loadAvg5m: cpuLoad[1].toFixed(2),
        loadAvg15m: cpuLoad[2].toFixed(2),
        cores: cpuInfo.cores,
        utilization: cpuInfo.utilization.toFixed(2) + '%',
      },
      concurrency: {
        recommended: recommendedConcurrency,
        availableMemory: this.formatBytes(availableForScraping),
        instanceSize: this.MEMORY_PER_INSTANCE_MB + 'MB',
      },
      queue: {
        waiting: queueCounts.waiting || 0,
        active: queueCounts.active || 0,
        completed: queueCounts.completed || 0,
        failed: queueCounts.failed || 0,
        delayed: queueCounts.delayed || 0,
        total: (queueCounts.waiting || 0) + (queueCounts.active || 0) + (queueCounts.delayed || 0),
      },
      capacity: {
        estimatedInstanceSize: `${this.MEMORY_PER_INSTANCE_MB} MB`,
        recommendedConcurrency: Math.max(1, recommendedConcurrency),
        currentLoad: queueCounts.active || 0,
        note: 'Based on 80% of currently free RAM divided by est. instance size',
      },
      health: this.getHealthStatus(
        cpuLoad[0],
        memInfo.usedPercent / 100,
        queueCounts.active || 0,
        recommendedConcurrency,
      ),
      timestamp: new Date().toISOString(),
    };
  }

  private getHealthStatus(
    cpuLoad: number,
    memoryUsage: number,
    activeJobs: number,
    maxConcurrency: number,
  ) {
    const cpuUsagePercent = (cpuLoad / os.cpus().length) * 100;
    const memoryUsagePercent = memoryUsage * 100;
    const queueLoadPercent = (activeJobs / Math.max(1, maxConcurrency)) * 100;

    let status = 'healthy';
    const alerts: string[] = [];

    if (cpuUsagePercent > 80) {
      status = 'critical';
      alerts.push(`High CPU usage: ${cpuUsagePercent.toFixed(1)}%`);
    } else if (cpuUsagePercent > 60) {
      status = 'warning';
      alerts.push(`Elevated CPU usage: ${cpuUsagePercent.toFixed(1)}%`);
    }

    if (memoryUsagePercent > 85) {
      status = 'critical';
      alerts.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    } else if (memoryUsagePercent > 70) {
      if (status !== 'critical') status = 'warning';
      alerts.push(`Elevated memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    if (queueLoadPercent > 90) {
      status = 'critical';
      alerts.push(`Queue overloaded: ${activeJobs}/${maxConcurrency} workers`);
    } else if (queueLoadPercent > 70) {
      if (status !== 'critical') status = 'warning';
      alerts.push(`High queue load: ${activeJobs}/${maxConcurrency} workers`);
    }

    return {
      status,
      alerts: alerts.length > 0 ? alerts : null,
      metrics: {
        cpu: `${cpuUsagePercent.toFixed(1)}%`,
        memory: `${memoryUsagePercent.toFixed(1)}%`,
        queue: `${activeJobs}/${maxConcurrency}`,
      },
    };
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
