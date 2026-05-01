import { describe, it, expect } from 'vitest';
import { isCacheUsable } from '../../../src/cache/store.js';
import type { CachedContent } from '../../../src/types.js';

function row(expiresAt: string | null): CachedContent {
  return {
    id: 1,
    url: 'u',
    normalizedUrl: 'u',
    title: '',
    markdown: '',
    rawHtml: '',
    metadata: '{}',
    links: '[]',
    images: '[]',
    fetchMethod: 'http',
    extractorUsed: 'defuddle',
    contentHash: 'x',
    fetchedAt: 'now',
    expiresAt,
  };
}

describe('isCacheUsable', () => {
  it('treats null expiresAt as fresh forever', () => {
    expect(isCacheUsable(row(null))).toEqual({ usable: true, stale: false });
  });

  it('returns fresh when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isCacheUsable(row(future))).toEqual({ usable: true, stale: false });
  });

  it('returns reject by default when expired', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isCacheUsable(row(past))).toEqual({ usable: false, stale: false });
  });

  it('returns stale when expired but within staleMaxSeconds', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isCacheUsable(row(past), { staleMaxSeconds: 3600 })).toEqual({
      usable: true,
      stale: true,
    });
  });

  it('rejects when expired beyond staleMaxSeconds', () => {
    const past = new Date(Date.now() - 4_000_000).toISOString();
    expect(isCacheUsable(row(past), { staleMaxSeconds: 3600 })).toEqual({
      usable: false,
      stale: false,
    });
  });
});
