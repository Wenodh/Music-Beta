import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './index';

describe('Logger', () => {
  beforeEach(() => {
    logger.getMemoryLogs(); // No clear method exposed for memory logs except in MemoryTransport
    // Actually, I should probably add a way to clear for testing or just check new entries.
  });

  it('should log debug messages in DEV mode', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // In Vitest, import.meta.env.DEV should be true by default in most setups or we can mock it.
    logger.debug('Test', 'Debug Message');

    expect(logger.getMemoryLogs()).toContainEqual(expect.objectContaining({
      level: 'debug',
      category: 'Test',
      message: 'Debug Message'
    }));
  });

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Test', 'Error Message', { detail: 'fatal' });

    expect(consoleSpy).toHaveBeenCalledWith('[Test] Error Message', { detail: 'fatal' });
  });
});
