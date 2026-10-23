import { useMemo, useState } from "react";
import { SESSION_KEY, auth } from "@/lib/api";
import { removeStored, useStored, writeStored } from "@/lib/storage";
import type { AdminSession } from "@/types";

const NO_SESSION: AdminSession | null = null;

/** The signed-in admin, or null when signed out or the session has expired. */
export function useSession(): AdminSession | null {
  const stored = useStored(SESSION_KEY, NO_SESSION);
  // Sessions saved by the old demo login have no server token; they count as signed out.
  return useMemo(() => (stored?.token && stored.expiresAt > Date.now() ? stored : null), [stored]);
}

/** Signs in and keeps the session in this browser. */
export function useLogin() {
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<AdminSession> => {
    setLoading(true);
    try {
      const session = await auth.login(email, password);
      writeStored(SESSION_KEY, session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
}

export function logout(): void {
  removeStored(SESSION_KEY);
}
