import { useCallback, useEffect, useState } from "react";

function messageOf(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

/**
 * Loads data once on mount. `load` must be stable — a module-level function
 * or one wrapped in useCallback — or it will reload on every render.
 * `reload` refreshes in place (after a change) without flipping back to loading.
 */
export function useResource<T>(load: () => Promise<T>, errorText: string) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError("");
    } catch (caught) {
      setError(messageOf(caught, errorText));
    } finally {
      setLoading(false);
    }
  }, [load, errorText]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/** Wraps a change (approve, delete, save…) with a pending flag and a readable error. */
export function useAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
  errorText: string,
) {
  const [pending, setPending] = useState(false);

  const run = async (...args: Args): Promise<Result> => {
    setPending(true);
    try {
      return await action(...args);
    } catch (caught) {
      throw new Error(messageOf(caught, errorText));
    } finally {
      setPending(false);
    }
  };

  return { run, pending };
}
