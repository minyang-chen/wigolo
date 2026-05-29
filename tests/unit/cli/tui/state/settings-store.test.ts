import { describe, it, expect } from 'vitest';
import { createSettingsStore } from '../../../../../src/cli/tui/state/settings-store.js';

describe('settings-store', () => {
  it('initial state has no pending, no dirty', () => {
    const s = createSettingsStore({ browserTypes: 'chromium' });
    expect(s.getCurrent()).toEqual({ browserTypes: 'chromium' });
    expect(s.getPending()).toEqual({});
    expect(s.isDirty()).toBe(false);
    expect(s.dirtyKeys()).toEqual([]);
  });

  it('set marks a key dirty and stages the pending value', () => {
    const s = createSettingsStore({ browserTypes: 'chromium' });
    s.set('browserTypes', 'firefox');
    expect(s.getPending()).toEqual({ browserTypes: 'firefox' });
    expect(s.isDirty()).toBe(true);
    expect(s.dirtyKeys()).toEqual(['browserTypes']);
  });

  it('set to current value clears dirty', () => {
    const s = createSettingsStore({ maxBrowsers: 3 });
    s.set('maxBrowsers', 5);
    expect(s.isDirty()).toBe(true);
    s.set('maxBrowsers', 3);
    expect(s.isDirty()).toBe(false);
    expect(s.dirtyKeys()).toEqual([]);
    expect(s.getPending()).toEqual({});
  });

  it('discard clears all pending', () => {
    const s = createSettingsStore({ a: 1, b: 2 });
    s.set('a', 9);
    s.set('b', 8);
    expect(s.isDirty()).toBe(true);
    s.discard();
    expect(s.getPending()).toEqual({});
    expect(s.isDirty()).toBe(false);
    // current must be untouched
    expect(s.getCurrent()).toEqual({ a: 1, b: 2 });
  });

  it('commit moves pending into current', () => {
    const s = createSettingsStore({ a: 1 });
    s.set('a', 2);
    s.commit();
    expect(s.getCurrent()).toEqual({ a: 2 });
    expect(s.getPending()).toEqual({});
    expect(s.isDirty()).toBe(false);
  });

  it('commit without pending is a no-op (no notify, no state change)', () => {
    const s = createSettingsStore({ a: 1 });
    let n = 0;
    const unsub = s.subscribe(() => {
      n++;
    });
    s.commit();
    expect(s.getCurrent()).toEqual({ a: 1 });
    expect(s.getPending()).toEqual({});
    expect(s.isDirty()).toBe(false);
    expect(n).toBe(0);
    unsub();
  });

  it('subscribe notifies on every state change (set, discard, set, commit)', () => {
    const s = createSettingsStore({ a: 1 });
    let n = 0;
    const unsub = s.subscribe(() => {
      n++;
    });
    s.set('a', 2);
    s.discard();
    s.set('a', 3);
    s.commit();
    expect(n).toBeGreaterThanOrEqual(4);
    unsub();
    // after unsub, no further notifications
    const prev = n;
    s.set('a', 4);
    expect(n).toBe(prev);
  });
});
