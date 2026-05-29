export interface SettingsStore {
  getCurrent(): Readonly<Record<string, unknown>>;
  getPending(): Readonly<Record<string, unknown>>;
  isDirty(): boolean;
  dirtyKeys(): string[];
  set(key: string, value: unknown): void;
  discard(): void;
  commit(): void;
  subscribe(fn: () => void): () => void;
}

export function createSettingsStore(
  initial: Readonly<Record<string, unknown>>,
): SettingsStore {
  const current: Record<string, unknown> = { ...initial };
  const pending = new Map<string, unknown>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const fn of listeners) fn();
  };

  return {
    getCurrent: () => ({ ...current }),
    getPending: () => Object.fromEntries(pending),
    isDirty: () => pending.size > 0,
    dirtyKeys: () => [...pending.keys()],
    set(key, value) {
      const cur = current[key];
      const same = JSON.stringify(cur) === JSON.stringify(value);
      if (same) pending.delete(key);
      else pending.set(key, value);
      notify();
    },
    discard() {
      pending.clear();
      notify();
    },
    commit() {
      if (pending.size === 0) return;
      for (const [k, v] of pending) current[k] = v;
      pending.clear();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
