import { CollaborationRateLimiter } from '../../src/collaboration/collaboration.rateLimiter';
import { RateLimitError } from '../../src/collaboration/collaboration.errors';

describe('CollaborationRateLimiter', () => {
  let limiter: CollaborationRateLimiter;

  beforeEach(() => {
    limiter = new CollaborationRateLimiter({
      maxOperationsPerSecond: 5,
      maxOperationsPerMinute: 20,
      windowSizeMs: 60000,
    });
  });

  describe('Per-second rate limiting', () => {
    it('should allow operations within per-second limit', () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed(userId)).toBe(true);
      }
    });

    it('should block operations exceeding per-second limit', () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(userId);
      }

      expect(limiter.isAllowed(userId)).toBe(false);
    });

    it('should reset per-second limit after 1 second', async () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(userId);
      }

      expect(limiter.isAllowed(userId)).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(limiter.isAllowed(userId)).toBe(true);
    });
  });

  describe('Per-minute rate limiting', () => {
    beforeEach(() => {
      limiter = new CollaborationRateLimiter({
        maxOperationsPerSecond: 1000,
        maxOperationsPerMinute: 20,
        windowSizeMs: 60000,
      });
    });

    it('should allow operations within per-minute limit', () => {
      const userId = 'user-1';

      for (let i = 0; i < 20; i++) {
        expect(limiter.isAllowed(userId)).toBe(true);
      }
    });

    it('should block operations exceeding per-minute limit', () => {
      const userId = 'user-1';

      for (let i = 0; i < 20; i++) {
        limiter.isAllowed(userId);
      }

      expect(limiter.isAllowed(userId)).toBe(false);
    });
  });

  describe('checkAndRecord', () => {
    it('should record allowed operation', () => {
      const userId = 'user-1';

      expect(() => {
        limiter.checkAndRecord(userId);
      }).not.toThrow();
    });

    it('should throw when limit exceeded', () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        limiter.checkAndRecord(userId);
      }

      expect(() => {
        limiter.checkAndRecord(userId);
      }).toThrow(RateLimitError);
    });
  });

  describe('User isolation', () => {
    it('should track limits per user independently', () => {
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user-1');
      }

      expect(limiter.isAllowed('user-1')).toBe(false);
      expect(limiter.isAllowed('user-2')).toBe(true);
    });
  });

  describe('Limit clearing', () => {
    it('should clear user limits', () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(userId);
      }

      expect(limiter.isAllowed(userId)).toBe(false);

      limiter.clearUserLimits(userId);

      expect(limiter.isAllowed(userId)).toBe(true);
    });

    it('should clear all limits', () => {
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user-1');
        limiter.isAllowed('user-2');
      }

      expect(limiter.isAllowed('user-1')).toBe(false);
      expect(limiter.isAllowed('user-2')).toBe(false);

      limiter.clearAllLimits();

      expect(limiter.isAllowed('user-1')).toBe(true);
      expect(limiter.isAllowed('user-2')).toBe(true);
    });
  });

  describe('Window cleanup', () => {
    it('should cleanup old timestamps', async () => {
      const userId = 'user-1';

      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(userId);
      }

      await new Promise((resolve) => setTimeout(resolve, 65000));

      expect(limiter.isAllowed(userId)).toBe(true);
    }, 70000);
  });
});
