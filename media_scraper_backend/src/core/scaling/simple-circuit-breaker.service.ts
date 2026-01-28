import { Injectable, Logger } from '@nestjs/common';

export class CircuitBreakerError extends Error {
  constructor(strategy: string) {
    super(`Strategy ${strategy} temporarily unavailable`);
    this.name = 'CircuitBreakerError';
  }
}

// Simple circuit breaker state
interface SimpleCircuit {
  failures: number;
  isOpen: boolean;
  nextRetry: number;
  lastFailure: number;
}

@Injectable()
export class SimpleCircuitBreakerService {
  private readonly logger = new Logger(SimpleCircuitBreakerService.name);

  // Simple map of strategy -> circuit state
  private circuits = new Map<string, SimpleCircuit>();

  // Simple thresholds
  private readonly FAILURE_THRESHOLD = 3; // Open after 3 failures
  private readonly RETRY_TIMEOUT = 30000; // 30 seconds timeout
  private readonly FAILURE_WINDOW = 60000; // 1 minute failure window

  // MAIN API - Execute with protection
  async execute<T>(strategyName: string, operation: () => Promise<T>): Promise<T> {
    const circuit = this.getCircuit(strategyName);

    // Fast path: if circuit is closed, execute directly
    if (!circuit.isOpen) {
      return this.executeWithTracking(strategyName, operation);
    }

    // Circuit is open - check if we can retry
    if (Date.now() >= circuit.nextRetry) {
      // Reset circuit to try again
      circuit.isOpen = false;
      circuit.failures = 0;
      return this.executeWithTracking(strategyName, operation);
    }

    // Circuit is open and not ready to retry
    throw new CircuitBreakerError(strategyName);
  }

  // Execute with failure tracking
  private async executeWithTracking<T>(
    strategyName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(strategyName);

    try {
      const result = await operation();

      // Success - reset failure count
      circuit.failures = 0;
      circuit.lastFailure = 0;

      return result;
    } catch (error) {
      // Failure - increment counter
      const now = Date.now();

      // Reset failures if outside window
      if (now - circuit.lastFailure > this.FAILURE_WINDOW) {
        circuit.failures = 0;
      }

      circuit.failures++;
      circuit.lastFailure = now;

      // Open circuit if threshold reached
      if (circuit.failures >= this.FAILURE_THRESHOLD) {
        circuit.isOpen = true;
        circuit.nextRetry = now + this.RETRY_TIMEOUT;

        this.logger.warn(`Circuit breaker OPEN for ${strategyName} (${circuit.failures} failures)`);
      }

      throw error;
    }
  }

  // Get or create circuit for strategy
  private getCircuit(strategyName: string): SimpleCircuit {
    if (!this.circuits.has(strategyName)) {
      this.circuits.set(strategyName, {
        failures: 0,
        isOpen: false,
        nextRetry: 0,
        lastFailure: 0,
      });
    }

    return this.circuits.get(strategyName)!;
  }

  // Check if strategy is available
  isStrategyAvailable(strategyName: string): boolean {
    const circuit = this.circuits.get(strategyName);
    if (!circuit) return true; // New strategies are available

    if (!circuit.isOpen) return true; // Circuit is closed

    // Circuit is open - check if retry time has passed
    return Date.now() >= circuit.nextRetry;
  }

  // Simple status for debugging
  getStatus(): Array<{ strategy: string; available: boolean; failures: number }> {
    const status: Array<{ strategy: string; available: boolean; failures: number }> = [];

    for (const [strategy, circuit] of this.circuits) {
      status.push({
        strategy,
        available: this.isStrategyAvailable(strategy),
        failures: circuit.failures,
      });
    }

    return status;
  }

  // Reset circuit breaker for strategy
  resetStrategy(strategyName: string): void {
    const circuit = this.circuits.get(strategyName);
    if (circuit) {
      circuit.failures = 0;
      circuit.isOpen = false;
      circuit.nextRetry = 0;
      circuit.lastFailure = 0;

      this.logger.log(`Circuit breaker reset for ${strategyName}`);
    }
  }

  // Reset all circuit breakers
  resetAll(): void {
    for (const [strategy, _] of this.circuits) {
      this.resetStrategy(strategy);
    }
    this.logger.log('All circuit breakers reset');
  }
}
