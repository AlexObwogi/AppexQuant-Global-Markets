import { describe, it, expect, beforeEach } from 'vitest';
import { derivRateTracker } from '../src/services/deriv/derivRateTracker.ts';

describe('DerivRateTracker Telemetry & Thresholds', () => {
  beforeEach(() => {
    derivRateTracker.reset();
  });

  it('tracks requests in a 60-second sliding window', () => {
    derivRateTracker.recordRequest('rest');
    derivRateTracker.recordRequest('ws');
    derivRateTracker.recordRequest('subscription');

    const stats = derivRateTracker.getStats();
    expect(stats.requestsInLastMinute).toBe(3);
    expect(stats.limitPerMinute).toBe(120);
    expect(stats.remaining).toBe(117);
    expect(stats.usagePercentage).toBeCloseTo((3 / 120) * 100, 1);
    expect(stats.status).toBe('NORMAL');
    expect(stats.isThrottled).toBe(false);
    expect(stats.breakdown.rest).toBe(1);
    expect(stats.breakdown.ws).toBe(1);
    expect(stats.breakdown.subscription).toBe(1);
  });

  it('flags ELEVATED and CRITICAL statuses as request limits are approached', () => {
    // Record 65 requests (over 50%)
    for (let i = 0; i < 65; i++) {
      derivRateTracker.recordRequest('ws');
    }

    let stats = derivRateTracker.getStats();
    expect(stats.status).toBe('ELEVATED');
    expect(stats.isThrottled).toBe(false);

    // Record up to 100 requests (> 80%)
    for (let i = 0; i < 35; i++) {
      derivRateTracker.recordRequest('rest');
    }

    stats = derivRateTracker.getStats();
    expect(stats.status).toBe('CRITICAL');
    expect(stats.remaining).toBe(20);

    // Record up to 120 requests (100% threshold)
    for (let i = 0; i < 20; i++) {
      derivRateTracker.recordRequest('auth');
    }

    stats = derivRateTracker.getStats();
    expect(stats.status).toBe('THROTTLED');
    expect(stats.isThrottled).toBe(true);
    expect(stats.remaining).toBe(0);
  });
});
