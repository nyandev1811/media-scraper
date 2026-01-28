import * as fs from 'fs';
import * as os from 'os';

export class DockerResourceReader {
  static getTotalMemory(): number {
    try {
      const memoryMax = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();

      if (memoryMax === 'max') {
        return os.totalmem();
      }

      return parseInt(memoryMax, 10);
    } catch (error) {
      try {
        const memoryLimit = fs
          .readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8')
          .trim();
        const limit = parseInt(memoryLimit, 10);

        if (limit > os.totalmem()) {
          return os.totalmem();
        }

        return limit;
      } catch {
        return os.totalmem();
      }
    }
  }

  static getCpuQuota(): number {
    try {
      const cpuMax = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
      const [quota, period] = cpuMax
        .split(' ')
        .map((v) => (v === 'max' ? Infinity : parseInt(v, 10)));

      if (quota === Infinity) {
        return os.cpus().length;
      }

      return quota / period;
    } catch (error) {
      try {
        const quota = parseInt(
          fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim(),
          10,
        );
        const period = parseInt(
          fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim(),
          10,
        );

        if (quota === -1) {
          return os.cpus().length;
        }

        return quota / period;
      } catch {
        return os.cpus().length;
      }
    }
  }

  static getMemoryInfo() {
    const total = this.getTotalMemory();
    const free = os.freemem();
    const used = total - free;

    return {
      total,
      free,
      used,
      usedPercent: (used / total) * 100,
      totalGB: (total / 1024 / 1024 / 1024).toFixed(2),
      usedGB: (used / 1024 / 1024 / 1024).toFixed(2),
    };
  }

  static getCpuInfo() {
    const quota = this.getCpuQuota();
    const cpuLoad = os.loadavg();

    return {
      cores: quota,
      physicalCores: os.cpus().length,
      load: cpuLoad[0],
      utilization: Math.min(100, (cpuLoad[0] / quota) * 100),
    };
  }
}
