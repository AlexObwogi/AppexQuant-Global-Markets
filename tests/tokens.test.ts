/**
 * AppexQuant Markets Global - Design Tokens Tests
 */

import { describe, it, expect } from 'vitest';
import { designTokens } from '../src/design/tokens';

describe('Design Tokens System', () => {
  it('contains mandatory Phase 1 core color values', () => {
    expect(designTokens.colors.dark.background.primary).toBe('#0B0E14'); // Deep Space
    expect(designTokens.colors.dark.surface.primary).toBe('#131822');    // Surface
    expect(designTokens.colors.dark.accent.primary).toBe('#38BDF8');     // Ice Blue
    expect(designTokens.colors.dark.status.success).toBe('#22C55E');    // Profit
    expect(designTokens.colors.dark.status.danger).toBe('#EF4444');     // Risk
    expect(designTokens.colors.dark.status.warning).toBe('#F59E0B');    // Warning
  });

  it('defines structured typography and spacing scale', () => {
    expect(designTokens.spacing.md).toBe('16px');
    expect(designTokens.radius.lg).toBe('16px');
    expect(designTokens.typography.fontFamily).toContain('Plus Jakarta Sans');
  });
});
