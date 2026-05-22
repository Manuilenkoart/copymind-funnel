import { describe, expect, it } from 'vitest';

import { withParams } from '@/app/lib/url';

describe('withParams', () => {
  it('returns href unchanged when params are empty', () => {
    expect(withParams('/funnel-1/0', {})).toBe('/funnel-1/0');
  });

  it('appends a single query param with a leading ?', () => {
    expect(withParams('/funnel-1/0', { utm_source: 'google' })).toBe(
      '/funnel-1/0?utm_source=google'
    );
  });

  it('appends multiple query params', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: 'cpc' })
    ).toBe('/funnel-1/0?utm_source=google&utm_medium=cpc');
  });

  it('uses & when the href already has a query string', () => {
    expect(withParams('/funnel-1/0?foo=bar', { utm_source: 'google' })).toBe(
      '/funnel-1/0?foo=bar&utm_source=google'
    );
  });

  it('skips empty-string values', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: '' })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('skips undefined values', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', utm_medium: undefined })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('drops array-valued params', () => {
    expect(
      withParams('/funnel-1/0', { utm_source: 'google', tags: ['a', 'b'] })
    ).toBe('/funnel-1/0?utm_source=google');
  });

  it('URL-encodes special characters in values', () => {
    expect(withParams('/funnel-1/0', { utm_source: 'a b&c' })).toBe(
      '/funnel-1/0?utm_source=a+b%26c'
    );
  });
});
