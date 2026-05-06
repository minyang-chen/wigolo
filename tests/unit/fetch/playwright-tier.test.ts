import { describe, it, expect, vi } from 'vitest';
import { detectPlaywrightInstall, shouldEscalate } from '../../../src/fetch/playwright-tier.js';

describe('shouldEscalate', () => {
  it('escalates when body is shorter than 500 chars', () => {
    expect(shouldEscalate('short body')).toBe(true);
  });
  it('escalates when body contains "enable JavaScript"', () => {
    const body = 'x'.repeat(2000) + ' please enable JavaScript to view this site';
    expect(shouldEscalate(body)).toBe(true);
  });
  it('does not escalate substantial English content', () => {
    expect(shouldEscalate('a'.repeat(2000))).toBe(false);
  });
});

describe('detectPlaywrightInstall', () => {
  it('returns { installed: boolean } without throwing', async () => {
    const r = await detectPlaywrightInstall();
    expect(typeof r.installed).toBe('boolean');
    if (!r.installed) expect(r.hint).toMatch(/playwright install/);
  });
});
