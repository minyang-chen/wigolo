/**
 * Task 3.4 — ToastStore action field
 *
 * Toast.action carries an optional { key, label, handler } that InkRoot
 * honors on keypress while the toast is visible. The coalescing save-group
 * logic must preserve the action of the first toast (so save + action arrives
 * as one unit) or the merged toast should carry the incoming action.
 */
import { describe, it, expect, vi } from 'vitest';
import { createToastStore } from '../../../../../src/cli/tui/state/toast-store.js';

describe('toast-store — action field', () => {
  it('stores action on toast', () => {
    const handler = vi.fn();
    const store = createToastStore();
    store.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    const toast = store.current();
    expect(toast?.action).toBeDefined();
    expect(toast?.action?.key).toBe('\r');
    expect(toast?.action?.label).toBe('⏎ Apply & verify');
  });

  it('action handler is callable', () => {
    const handler = vi.fn();
    const store = createToastStore();
    store.push({
      message: 'Saved · api key',
      severity: 'ok',
      ttl: 3000,
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    store.current()?.action?.handler();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('toast without action has undefined action', () => {
    const store = createToastStore();
    store.push({ message: 'Saved · api key', severity: 'ok', ttl: 3000 });
    expect(store.current()?.action).toBeUndefined();
  });

  it('coalesced save toast preserves action from the first push', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const store = createToastStore();
    store.push({
      message: 'Saved · A',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      action: { key: '\r', label: '⏎ Apply & verify', handler },
    });
    vi.advanceTimersByTime(100);
    store.push({
      message: 'Saved · B',
      severity: 'ok',
      ttl: 3000,
      group: 'save',
      // second push has no action
    });
    const toast = store.current();
    expect(toast?.message).toBe('Saved · 2 fields');
    // Action from first push is preserved
    expect(toast?.action).toBeDefined();
    vi.useRealTimers();
  });

  it('dismiss() immediately removes the active toast', () => {
    const store = createToastStore();
    store.push({ message: 'Saved · api key', severity: 'ok', ttl: 3000 });
    expect(store.current()).not.toBeNull();
    store.dismiss();
    expect(store.current()).toBeNull();
  });
});
