import { createLogger } from '@namespace/logger';
import { RateLimitError } from './collaboration.errors';

const logger = createLogger('collaboration.rateLimiter');

interface RateLimitConfig {
  maxOperationsPerSecond: number;
  maxOperationsPerMinute: number;
  windowSizeMs: number;
}

interface UserRateLimit {
  operationTimestamps: number[];
  lastCleanupTime: number;
}

export class CollaborationRateLimiter {
  private userLimits: Map<string, UserRateLimit> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxOperationsPerSecond: config.maxOperationsPerSecond || 100,
      maxOperationsPerMinute: config.maxOperationsPerMinute || 1000,
      windowSizeMs: config.windowSizeMs || 60000,
    };
  }

  isAllowed(userId: string): boolean {
    const now = Date.now();
    let userLimit = this.userLimits.get(userId);

    if (!userLimit) {
      userLimit = {
        operationTimestamps: [],
        lastCleanupTime: now,
      };
      this.userLimits.set(userId, userLimit);
    }

    this.cleanupOldTimestamps(userLimit, now);

    const recentOperations = userLimit.operationTimestamps.filter((ts) => now - ts < 1000);
    const allOperations = userLimit.operationTimestamps;

    if (recentOperations.length >= this.config.maxOperationsPerSecond) {
      logger.warn(`Rate limit exceeded (per second) for user ${userId}`);
      return false;
    }

    if (
      allOperations.length >= this.config.maxOperationsPerMinute
    ) {
      logger.warn(`Rate limit exceeded (per minute) for user ${userId}`);
      return false;
    }

    userLimit.operationTimestamps.push(now);
    return true;
  }

  checkAndRecord(userId: string): void {
    if (!this.isAllowed(userId)) {
      const message =
        `Rate limit exceeded for user ${userId}. Maximum operations: ` +
        `${this.config.maxOperationsPerSecond}/s, ${this.config.maxOperationsPerMinute}/min`;
      throw new RateLimitError(message);
    }
  }

  private cleanupOldTimestamps(userLimit: UserRateLimit, now: number): void {
    if (now - userLimit.lastCleanupTime < 10000) {
      return;
    }

    userLimit.operationTimestamps = userLimit.operationTimestamps.filter(
      (ts) => now - ts < this.config.windowSizeMs,
    );
    userLimit.lastCleanupTime = now;
  }

  clearUserLimits(userId: string): void {
    this.userLimits.delete(userId);
  }

  clearAllLimits(): void {
    this.userLimits.clear();
  }
}
