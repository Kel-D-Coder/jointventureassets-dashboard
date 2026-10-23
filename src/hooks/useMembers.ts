import { useEffect, useMemo, useState } from "react";
import { accounts } from "@/lib/api";
import type { MemberAccount } from "@/types";

// Every name on a page looks members up; they share one recent copy of the list.
const FRESH_MS = 15_000;
let cache: { at: number; members: Promise<MemberAccount[]> } | null = null;

function loadMembers(): Promise<MemberAccount[]> {
  if (!cache || Date.now() - cache.at > FRESH_MS) cache = { at: Date.now(), members: accounts.list().catch((): MemberAccount[] => []) };
  return cache.members;
}

/** Call after approving or suspending someone, so names pick up the change. */
export function forgetMembers() {
  cache = null;
}

export type MemberLookup = (who: { email?: string; userId?: string }) => MemberAccount | undefined;

/** Finds the registered member behind a person on a page (by account id, or by email), if there is one. */
export function useMemberLookup(): MemberLookup {
  const [members, setMembers] = useState<MemberAccount[]>([]);

  useEffect(() => {
    let live = true;
    void loadMembers().then((list) => live && setMembers(list));
    return () => {
      live = false;
    };
  }, []);

  return useMemo(() => {
    const byEmail = new Map(members.map((member) => [member.email.toLowerCase(), member]));
    const byId = new Map(members.map((member) => [member.id, member]));
    return ({ email, userId }) => (userId ? byId.get(userId) : undefined) ?? (email ? byEmail.get(email.trim().toLowerCase()) : undefined);
  }, [members]);
}
