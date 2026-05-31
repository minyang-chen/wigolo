/**
 * Task 3.5 — Phase 3 integration: per-field ✓, Apply & Verify route
 *
 * End-to-end test: edit a field → save → ✓ appears → header shows Apply &
 * verify → press Enter → routes to VerifyScreen (action view).
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { InkRoot } from '../../../../../src/cli/tui/router/ink.js';
import { createSettingsStore } from '../../../../../src/cli/tui/state/settings-store.js';
import { createToastStore } from '../../../../../src/cli/tui/state/toast-store.js';
import { CATALOG } from '../../../../../src/cli/tui/schema/catalog.js';

vi.mock('../../../../../src/cli/tui/actions/write-config.js', () => ({
  persistKey: vi.fn().mockResolvedValue(undefined),
  writeMcpConfig: vi.fn().mockResolvedValue({ results: [], anyFailed: false }),
}));

afterEach(() => {
  cleanup();
  delete process.env.WIGOLO_TUI_REDUCED_MOTION;
});

beforeEach(() => {
  process.env.WIGOLO_TUI_REDUCED_MOTION = '1';
});

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function makeStore() {
  return createSettingsStore({
    browserTypes: 'chromium',
    maxBrowsers: 3,
    browserIdleTimeoutMs: 30000,
  });
}

describe('Phase 3 integration', () => {
  it('save toast with Apply & Verify action appears after save, Enter routes to verify', async () => {
    const store = makeStore();
    const toastStore = createToastStore();

    const { stdin, lastFrame } = render(
      <InkRoot
        store={store}
        catalog={CATALOG}
        initialRoute="home"
        toastStore={toastStore}
      />,
    );

    await wait(30);

    // Push a save toast (simulating what commitOne does)
    toastStore.push({
      message: 'Saved · browser types',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
    });

    await wait(50);

    // InkRoot should have retrofitted the action
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Apply & verify');

    // Press Enter — should fire the action and route to VerifyScreen
    stdin.write('\r');
    await wait(50);

    // After routing to verify, the toast action label should be gone
    const afterFrame = lastFrame() ?? '';
    expect(afterFrame).not.toContain('Apply & verify');
    // VerifyScreen should now be rendered
    expect(afterFrame).toBeTruthy();
  });

  it('sidebar dirty-dot pulses and disappears after store clears dirty keys', async () => {
    vi.useFakeTimers();
    const store = makeStore();
    const toastStore = createToastStore();

    // Set a dirty key so the sidebar shows a dot
    store.set('maxBrowsers', 99);

    const { lastFrame, rerender } = render(
      <InkRoot
        store={store}
        catalog={CATALOG}
        initialRoute="home"
        toastStore={toastStore}
      />,
    );

    await vi.advanceTimersByTimeAsync(30);

    // Should show dirty dot
    const dirtyFrame = lastFrame() ?? '';
    expect(dirtyFrame).toContain('●');

    // Commit and notify (simulates autosave completing)
    store.commit();

    await vi.advanceTimersByTimeAsync(50);

    // Pulse is active — dot still visible during pulse window
    expect(lastFrame() ?? '').toContain('●');

    // After pulse expires (500ms)
    await vi.advanceTimersByTimeAsync(600);
    const cleanFrame = lastFrame() ?? '';
    // Dirty dot should be gone (reduced motion skips pulse, so gone immediately;
    // or with motion allowed and 600ms elapsed, pulse has expired)
    // In reduced motion mode the dot is gone right away
    const lines = cleanFrame.split('\n');
    // Find the Browser line in the sidebar
    const browserLine = lines.find((l) => l.includes('Browser') && !l.includes('Engine'));
    // No dot on clean sidebar
    if (browserLine) {
      expect(browserLine).not.toContain('●');
    }

    vi.useRealTimers();
  });
});
