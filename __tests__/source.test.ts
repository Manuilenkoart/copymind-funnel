import { describe, expect, it } from 'vitest';

import { getUtmSource } from '@/app/lib/source';

describe('getUtmSource', () => {
  it('returns the utm_source when present', () => {
    expect(getUtmSource({ utm_source: 'google' })).toBe('google');
  });

  it('returns "Direct" when utm_source is missing', () => {
    expect(getUtmSource({})).toBe('Direct');
  });

  it('returns "Direct" when utm_source is an empty string', () => {
    expect(getUtmSource({ utm_source: '' })).toBe('Direct');
  });

  it('returns "Direct" when utm_source is whitespace only', () => {
    expect(getUtmSource({ utm_source: '   ' })).toBe('Direct');
  });

  it('trims whitespace around a real value', () => {
    expect(getUtmSource({ utm_source: '  facebook  ' })).toBe('facebook');
  });

  it('returns "Direct" when utm_source is an array (Next.js repeated key)', () => {
    expect(getUtmSource({ utm_source: ['a', 'b'] })).toBe('Direct');
  });

  it('ignores unrelated keys', () => {
    expect(getUtmSource({ utm_medium: 'cpc', gclid: 'abc' })).toBe('Direct');
  });
});
