import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

export class CircuitBreakerError extends Error {
  constructor(strategy: string, state: CircuitState) {
    super(`Circuit breaker ${state} for strategy: ${strategy}`);
    this.name = 'CircuitBreakerError';
  }
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Max failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  successThreshold: number; // Successes needed to close from half-open
}

class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state = CircuitState.CLOSED;
  private nextAttempt = 0;
  private lastFailureTime = 0;
  private readonly logger: Logger;

  constructor(
    private readonly strategyName: string,
    private readonly config: CircuitBreakerConfig,
  ) {
    this.logger = new Logger(`CircuitBreaker:${this.strategyName}`);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError(this.strategyName, CircuitState.OPEN);
      }
      // Move to half-open to test recovery
      this.state = CircuitState.HALF_OPEN;
      this.logger.log(`Circuit breaker half-open for ${this.strategyName}`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        this.logger.log(`Circuit breaker closed for ${this.strategyName} - service recovered`);
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();

    // Reset failure count if outside monitoring period
    if (
      this.lastFailureTime - (Date.now() - this.config.monitoringPeriod) >
      this.config.monitoringPeriod
    ) {
      this.failures = 0;
    }

    this.failures++;
    this.successes = 0; // Reset successes on any failure

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
      this.logger.warn(
        `Circuit breaker OPEN for ${this.strategyName} - ${this.failures} failures in monitoring period`,
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      strategy: this.strategyName,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt > Date.now() ? this.nextAttempt - Date.now() : 0,
    };
  }

  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.state = CircuitState.CLOSED;
    this.nextAttempt = 0;
    this.logger.log(`Circuit breaker reset for ${this.strategyName}`);
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open after 5 failures
    recoveryTimeout: 30000, // Wait 30s before retry
    monitoringPeriod: 60000, // Count failures in 60s window
    successThreshold: 3, // Need 3 successes to close
  };

  // Strategy-specific configs for different failure tolerances
  private readonly strategyConfigs: Record<string, Partial<CircuitBreakerConfig>> = {
    Cheerio: {
      failureThreshold: 3, // Cheerio should fail fast
      recoveryTimeout: 10000, // Quick recovery
    },
    Puppeteer: {
      failureThreshold: 5, // More tolerance for Puppeteer
      recoveryTimeout: 30000, // Longer recovery time
    },
    'Stealth Puppeteer': {
      failureThreshold: 7, // Most tolerance for stealth
      recoveryTimeout: 60000, // Longest recovery time
    },
    YouTube: {
      failureThreshold: 2, // YouTube API should be reliable
      recoveryTimeout: 15000, // Medium recovery
    },
  };

  async execute<T>(strategyName: string, operation: () => Promise<T>): Promise<T> {
    const breaker = this.getOrCreateBreaker(strategyName);
    return breaker.execute(operation);
  }

  private getOrCreateBreaker(strategyName: string): CircuitBreaker {
    if (!this.breakers.has(strategyName)) {
      const config = {
        ...this.defaultConfig,
        ...this.strategyConfigs[strategyName],
      };

      this.breakers.set(strategyName, new CircuitBreaker(strategyName, config));
      this.logger.log(`Created circuit breaker for ${strategyName}`);
    }

    return this.breakers.get(strategyName)!;
  }

  getAllStats() {
    const stats: Array<{
      strategy: string;
      state: CircuitState;
      failures: number;
      successes: number;
      nextAttempt: number;
    }> = [];
    for (const [_, breaker] of this.breakers) {
      stats.push(breaker.getStats());
    }
    return stats;
  }

  resetBreaker(strategyName: string): void {
    const breaker = this.breakers.get(strategyName);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAllBreakers(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  isStrategyAvailable(strategyName: string): boolean {
    const breaker = this.breakers.get(strategyName);
    return !breaker || breaker.getState() !== CircuitState.OPEN;
  }
}
