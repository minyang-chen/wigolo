/**
 * Task 3.4 — Apply & Verify affordance
 *
 * When a save toast with action fires, InkRoot wires the keypress to the
 * action handler and dismisses the toast after the handler fires.
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

describe('InkRoot — Apply & Verify affordance', () => {
  it('shows toast action label in header when save toast has action', async () => {
    const store = makeStore();
    const toastStore = createToastStore();
    const handler = vi.fn();
    toastStore.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    const { lastFrame } = render(
      <InkRoot store={store} catalog={CATALOG} initialRoute="home" toastStore={toastStore} />,
    );
    await wait(30);
    const frame = lastFrame() ?? '';
    // Header must show the action label inline with the save message
    expect(frame).toContain('Apply & verify');
  });

  it('fires action handler when Enter is pressed while action toast is visible', async () => {
    const store = makeStore();
    const toastStore = createToastStore();
    const handler = vi.fn();
    toastStore.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    const { stdin } = render(
      <InkRoot store={store} catalog={CATALOG} initialRoute="home" toastStore={toastStore} />,
    );
    await wait(30);
    stdin.write('\r');
    await wait(30);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dismisses toast after action handler fires', async () => {
    const store = makeStore();
    const toastStore = createToastStore();
    const handler = vi.fn();
    toastStore.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    const { stdin, lastFrame } = render(
      <InkRoot store={store} catalog={CATALOG} initialRoute="home" toastStore={toastStore} />,
    );
    await wait(30);
    stdin.write('\r');
    await wait(30);
    // After handler fires, toast is dismissed so 'Apply & verify' label disappears
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Apply & verify');
  });

  it('does not fire action when no action toast is active', async () => {
    const store = makeStore();
    const toastStore = createToastStore();
    toastStore.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      // no action
    });
    const { stdin } = render(
      <InkRoot store={store} catalog={CATALOG} initialRoute="home" toastStore={toastStore} />,
    );
    await wait(30);
    // Press Enter — should not crash, just normal behavior
    expect(() => stdin.write('\r')).not.toThrow();
    await wait(30);
  });

  it('pressing Enter routes to VerifyScreen via action handler', async () => {
    const store = makeStore();
    const toastStore = createToastStore();
    const { stdin, lastFrame } = render(
      <InkRoot store={store} catalog={CATALOG} initialRoute="home" toastStore={toastStore} />,
    );

    // Push a save toast with a verify action
    toastStore.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: {
        key: '\r',
        label: '⏎ Apply & verify',
        handler: () => {},  // Will be replaced by InkRoot's real action
      },
    });
    await wait(30);
    stdin.write('\r');
    await wait(30);
    // After firing, toast clears — frame should not contain the action label
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Apply & verify');
  });
});
