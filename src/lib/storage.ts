import { useMemo, useSyncExternalStore } from "react";

/** Fired on same-tab writes; the native `storage` event only covers other tabs. */
const CHANGE_EVENT = "jva-admin-storage";

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readStored<T>(key: string, fallback: T): T {
  return parse(readRaw(key), fallback);
}

/** Throws if storage is full or blocked — callers surface that to the user. */
export function writeStored<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing stored to remove.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Live read of one key: re-renders whenever it changes, in this tab or another.
 * The snapshot is the raw string, so React only sees a change when the stored
 * value really changed. `fallback` must be a stable (module-level) value.
 */
export function useStored<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  return useMemo(() => parse(raw, fallback), [raw, fallback]);
}
