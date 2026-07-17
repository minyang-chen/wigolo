import type { BrowserType } from '../types.js';

/**
 * Anti-bot fingerprint hardening for the dedicated browser-tier stealth path.
 *
 * Pure helpers (no browser-engine value import — types only) so they are
 * unit-testable without launching a real page. The browser tier consumes these
 * to build a DEDICATED per-fetch context whose fingerprint differs from the
 * pooled default, then closes it at end-of-fetch. All user-facing strings use
 * capability language — this module never leaks vendor internals.
 */

/**
 * Pinned Chrome desktop major version. Kept in ONE place so the TLS tier's
 * default browser profile (`chrome_142`) and this browser UA present a single,
 * coherent Chrome identity — a prerequisite for reusing a clearance cookie
 * across the two tiers. Bump BOTH together when the pin moves.
 */
export const STEALTH_CHROME_MAJOR = 142;

const CHROME_FULL_VERSION = `${STEALTH_CHROME_MAJOR}.0.0.0`;

/** Default desktop viewport for the dedicated stealth context. */
const STEALTH_VIEWPORT = { width: 1280, height: 800 } as const;

/**
 * A pinned modern Chrome desktop UA string. The Chrome major matches
 * {@link STEALTH_CHROME_MAJOR} so the browser tier and the TLS-impersonation
 * tier advertise the same Chrome identity.
 */
export function resolveStealthUA(): string {
  return (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    `Chrome/${CHROME_FULL_VERSION} Safari/537.36`
  );
}

/**
 * Chromium launch args that reduce trivial automation detection. Firefox and
 * WebKit take none of these flags — they are Chromium-specific — so return an
 * empty array for those engines. Chosen to be safe for headless rendering:
 * none of these disable the compositor or GPU paths that a page needs to lay
 * out and paint.
 */
export function stealthLaunchArgs(type: BrowserType): string[] {
  if (type !== 'chromium') return [];
  return [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-infobars',
    `--window-size=${STEALTH_VIEWPORT.width},${STEALTH_VIEWPORT.height}`,
    '--lang=en-US',
  ];
}

/**
 * Options object for `browser.newContext(...)` on the dedicated stealth path.
 * A plain object usable directly as the newContext argument; caller overrides
 * (auth storage state, extra headers) merge on top without dropping the
 * stealth defaults. `acceptDownloads` mirrors the pooled path so a PDF response
 * is still buffered rather than turning into a hard navigation error.
 */
export function stealthContextOptions(
  ua: string,
  opts?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    userAgent: ua,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { ...STEALTH_VIEWPORT },
    acceptDownloads: true,
    extraHTTPHeaders: {
      'accept-language': 'en-US,en;q=0.9',
    },
    ...opts,
  };
}

/**
 * Page init script (run via `context.addInitScript`) patching the
 * highest-signal automation leaks: `navigator.webdriver`, a plausible
 * `navigator.plugins` / `navigator.languages`, a `window.chrome` runtime stub,
 * and `navigator.permissions.query` for the notifications quirk. Written as a
 * function body so it can be compiled and evaluated in tests; guards keep it
 * from throwing on a real page where some of these are already read-only.
 */
export const STEALTH_INIT_SCRIPT = `
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
} catch (e) { /* already patched or read-only */ }
try {
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
} catch (e) { /* ignore */ }
try {
  Object.defineProperty(navigator, 'plugins', {
    get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' },
    ],
  });
} catch (e) { /* ignore */ }
try {
  if (typeof window !== 'undefined' && !window.chrome) {
    window.chrome = { runtime: {} };
  }
} catch (e) { /* ignore */ }
try {
  if (navigator.permissions && navigator.permissions.query) {
    const originalQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (parameters) =>
      parameters && parameters.name === 'notifications'
        ? Promise.resolve({ state: (typeof Notification !== 'undefined' ? Notification.permission : 'default') })
        : originalQuery(parameters);
  }
} catch (e) { /* ignore */ }
`;
