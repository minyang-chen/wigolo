import { describe, it, expect } from 'vitest';
import { handleFetch } from '../../src/tools/fetch.js';

describe('handleFetch mode:cache', () => {
  it('returns explicit cache_miss StageError when URL not cached', async () => {
    const url = 'https://example.com/never-cached-' + Date.now();
    const out = await handleFetch({ url, mode: 'cache' } as any, {} as any);
    expect((out as any).error).toBe('cache_miss');
    expect((out as any).error_reason).toMatch(/not in cache/i);
    expect((out as any).stage).toBe('fetch');
  });
});
