import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { DockerResourceReader } from '../core/common/docker-resource-reader';

@Injectable()
export class LightweightSystemService {
  private readonly MEMORY_PER_INSTANCE_MB = 300;

  getBasicMetrics() {
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

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
