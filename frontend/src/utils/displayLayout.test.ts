import { describe, it, expect, vi } from 'vitest';
import { BREAKPOINTS } from '../theme/breakpoints';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { resolveIsWideLayout } from './displayLayout';

describe('resolveIsWideLayout', () => {

  it('mobile mode forces narrow on web', () => {
    expect(resolveIsWideLayout(1024, 'mobile')).toBe(false);
  });

  it('auto mode uses breakpoint on web', () => {
    expect(resolveIsWideLayout(BREAKPOINTS.TABLET - 1, 'auto')).toBe(false);
    expect(resolveIsWideLayout(BREAKPOINTS.TABLET, 'auto')).toBe(true);
  });

  it('web mode uses breakpoint on web', () => {
    expect(resolveIsWideLayout(BREAKPOINTS.TABLET, 'web')).toBe(true);
  });
});
