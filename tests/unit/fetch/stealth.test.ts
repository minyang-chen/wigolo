import { describe, it, expect } from 'vitest';
import {
  resolveStealthUA,
  stealthLaunchArgs,
  stealthContextOptions,
  STEALTH_INIT_SCRIPT,
  STEALTH_CHROME_MAJOR,
} from '../../../src/fetch/stealth.js';

describe('resolveStealthUA', () => {
  it('returns a modern Chrome desktop UA pinned to the TLS-tier Chrome major', () => {
    const ua = resolveStealthUA();
    // Must be a coherent Chrome identity — same major as the TLS default
    // (chrome_142) so browser + TLS present one identity for clearance reuse.
    expect(ua).toContain(`Chrome/${STEALTH_CHROME_MAJOR}.`);
    expect(STEALTH_CHROME_MAJOR).toBe(142);
    expect(ua).toMatch(/^Mozilla\/5\.0 /);
    expect(ua).toContain('Safari/537.36');
    // Desktop, not mobile.
    expect(ua).not.toContain('Mobile');
  });
});

describe('stealthLaunchArgs', () => {
  it('disables the automation-controlled blink feature for chromium', () => {
    const args = stealthLaunchArgs('chromium');
    expect(args).toContain('--disable-blink-features=AutomationControlled');
    // A consistent locale + window-size reduce trivial headless fingerprints.
    expect(args.some((a) => a.startsWith('--window-size='))).toBe(true);
    expect(args).toContain('--lang=en-US');
  });

  it('returns [] for non-chromium engines (args are chromium-specific)', () => {
    expect(stealthLaunchArgs('webkit')).toEqual([]);
    expect(stealthLaunchArgs('firefox')).toEqual([]);
  });
});

describe('stealthContextOptions', () => {
  it('carries the UA, en-US locale, a US timezone, and a viewport', () => {
    const ua = resolveStealthUA();
    const opts = stealthContextOptions(ua);
    expect(opts.userAgent).toBe(ua);
    expect(opts.locale).toBe('en-US');
    expect(opts.timezoneId).toBe('America/New_York');
    expect(opts.viewport).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
    // The pooled path passes acceptDownloads:true; the dedicated stealth
    // context must preserve that so a PDF response is still buffered.
    expect(opts.acceptDownloads).toBe(true);
  });

  it('merges caller overrides without dropping the stealth defaults', () => {
    const ua = resolveStealthUA();
    const opts = stealthContextOptions(ua, { storageState: '/tmp/state.json' });
    expect(opts.storageState).toBe('/tmp/state.json');
    expect(opts.userAgent).toBe(ua);
    expect(opts.locale).toBe('en-US');
  });
});

describe('STEALTH_INIT_SCRIPT', () => {
  it('is syntactically valid JS that does not throw when evaluated', () => {
    // A real page runs it as a function body; compiling + calling it in a
    // stubbed navigator/window environment proves it neither has a syntax
    // error nor throws on load.
    const navigator: Record<string, unknown> = {
      permissions: { query: () => Promise.resolve({ state: 'granted' }) },
    };
    const win: Record<string, unknown> = {};
    const runner = new Function(
      'navigator',
      'window',
      'Notification',
      STEALTH_INIT_SCRIPT,
    );
    expect(() => runner(navigator, win, { permission: 'default' })).not.toThrow();
  });

  it('patches the highest-signal automation leaks', () => {
    expect(STEALTH_INIT_SCRIPT).toContain('webdriver');
    expect(STEALTH_INIT_SCRIPT).toContain('plugins');
    expect(STEALTH_INIT_SCRIPT).toContain('languages');
  });
});
