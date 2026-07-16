/**
 * Minimal vanilla store — the zustand pattern (setState / getState /
 * subscribe) implemented dependency-free, adopted from the incorporated
 * zustand library (pmndrs/zustand, src/vanilla.ts).
 *
 * The Forge uses it as the single owning seam for its state so UI layers
 * only project it; they never own forge state themselves.
 */

export interface StoreApi<T> {
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  getState: () => T;
  subscribe: (listener: (state: T, prev: T) => void) => () => void;
}

export function createStore<T extends object>(initial: T): StoreApi<T> {
  let state = initial;
  const listeners = new Set<(s: T, p: T) => void>();

  const setState: StoreApi<T>['setState'] = (partial) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    if (next == null) return;
    const prev = state;
    state = { ...state, ...next };
    listeners.forEach((l) => l(state, prev));
  };

  return {
    setState,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
