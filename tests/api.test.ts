/**
 * AppexQuant Markets Global - API Response & Error Contract Tests
 */

import { describe, it, expect } from 'vitest';
import { createCorrelationId, createSuccessResponse, createErrorResponse } from '../src/types/api';

describe('API Contract & Correlation ID Utilities', () => {
  it('generates APX formatted correlation IDs', () => {
    const id = createCorrelationId();
    expect(id).toMatch(/^APX-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('builds structured success responses', () => {
    const res = createSuccessResponse({ foo: 'bar' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ foo: 'bar' });
    expect(res.requestId).toMatch(/^APX-/);
    expect(res.timestamp).toBeDefined();
  });

  it('builds structured error responses without leaking internal detail', () => {
    const err = createErrorResponse('Unauthorized access', 'UNAUTHORIZED');
    expect(err.success).toBe(false);
    expect(err.error?.code).toBe('UNAUTHORIZED');
    expect(err.error?.message).toBe('Unauthorized access');
  });
});
