export interface ToastAction {
  /** The key that triggers the action (e.g. `'\r'` for Enter). */
  key: string;
  /** Short label shown inline in the header (e.g. `'⏎ Apply & verify'`). */
  label: string;
  /** Called when InkRoot sees the matching key while this toast is active. */
  handler: () => void;
}

export interface Toast {
  message: string;
  severity: 'ok' | 'warn' | 'err';
  ttl: number;
  group?: string;
  action?: ToastAction;
}

type Listener = () => void;

export interface ToastStore {
  push(t: Toast): void;
  current(): Toast | null;
  queue(): Toast[];
  subscribe(fn: Listener): () => void;
  /** Immediately remove the currently active toast (e.g. after action fires). */
  dismiss(): void;
  /**
   * Attach (or replace) the action on the currently active toast without
   * changing its message, severity, or TTL. No-op when queue is empty.
   */
  setCurrentAction(action: ToastAction): void;
}

export function createToastStore(): ToastStore {
  let queue: Toast[] = [];
  const listeners = new Set<Listener>();
  const timers = new Map<Toast, ReturnType<typeof setTimeout>>();
  const fire = () => listeners.forEach((l) => l());

  function scheduleRemoval(t: Toast): void {
    const handle = setTimeout(() => {
      queue = queue.filter((q) => q !== t);
      timers.delete(t);
      fire();
    }, t.ttl);
    timers.set(t, handle);
  }

  function push(t: Toast): void {
    if (t.group === 'save') {
      const last = queue[queue.length - 1];
      if (last && last.group === 'save') {
        const m = /^Saved · (\d+) fields$/.exec(last.message);
        const next = m ? Number(m[1]) + 1 : 2;
        // Preserve the action from the existing toast (first save wins).
        const merged: Toast = {
          ...last,
          message: `Saved · ${next} fields`,
          action: last.action ?? t.action,
        };
        const prevTimer = timers.get(last);
        if (prevTimer !== undefined) { clearTimeout(prevTimer); timers.delete(last); }
        queue[queue.length - 1] = merged;
        scheduleRemoval(merged);
        fire();
        return;
      }
    }
    queue.push(t);
    scheduleRemoval(t);
    fire();
  }

  function dismiss(): void {
    const head = queue[0];
    if (!head) return;
    const handle = timers.get(head);
    if (handle !== undefined) { clearTimeout(handle); timers.delete(head); }
    queue = queue.slice(1);
    fire();
  }

  function setCurrentAction(action: ToastAction): void {
    if (queue.length === 0) return;
    queue[0] = { ...queue[0]!, action };
    fire();
  }

  return {
    push,
    current: () => queue[0] ?? null,
    queue: () => [...queue],
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    dismiss,
    setCurrentAction,
  };
}
