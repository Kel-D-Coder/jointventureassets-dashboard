import { useEffect, useMemo, useState } from "react";
import { FaMagnifyingGlass, FaPen } from "react-icons/fa6";
import { accounts } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/format";
import { Field, inputClass } from "@/ui";
import type { MemberAccount } from "@/types";

export interface OwnerValue {
  /** The member's account id, when the owner is a member of the platform. */
  userId?: string;
  name: string;
  email: string;
  phone: string;
}

const SHOWN = 6;

/**
 * Picks a listing's owner from the platform's members: their name, email and phone fill in
 * automatically and the listing is linked to their account. Owners who aren't members can
 * still be typed in by hand.
 */
export function OwnerPicker({
  value,
  onChange,
  error,
  role = "owner",
}: {
  value: OwnerValue;
  onChange: (next: OwnerValue) => void;
  error?: string;
  /** Who is being picked, for the wording: a listing's owner, or a buyer. */
  role?: "owner" | "buyer";
}) {
  const Role = role === "buyer" ? "Buyer" : "Owner";
  const { data: members = [], loading, error: loadError } = useResource(accounts.list, "Couldn't load the members.");
  const [query, setQuery] = useState("");
  // A listing that already has an owner typed in, and no member account, opens in manual mode.
  const [manual, setManual] = useState(() => !value.userId && Boolean(value.name.trim() || value.email.trim()));

  const linked = members.find((member) => member.id === value.userId);
  const byEmail = useMemo(
    () => (value.userId || !value.email.trim() ? undefined : members.find((member) => member.email.toLowerCase() === value.email.trim().toLowerCase())),
    [members, value.userId, value.email],
  );

  // The owner's email belongs to a member (e.g. a listing made from their listing request): link them.
  useEffect(() => {
    if (byEmail) {
      onChange(fromMember(byEmail));
      setManual(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byEmail]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members
      .filter((member) => !needle || [member.fullName, member.email, member.phoneNumber, member.profile.companyName ?? ""].join(" ").toLowerCase().includes(needle))
      .slice(0, SHOWN);
  }, [members, query]);

  if (manual) {
    return (
      <div className="mt-3 space-y-3">
        <Field label={`${Role}'s name`} error={error}>
          <input value={value.name} onChange={(e) => onChange({ ...value, userId: undefined, name: e.target.value })} placeholder="Person or company" className={inputClass} />
        </Field>
        <Field label={`${Role}'s email`}>
          <input type="email" value={value.email} onChange={(e) => onChange({ ...value, userId: undefined, email: e.target.value })} className={inputClass} />
        </Field>
        <Field label={`${Role}'s phone`} hint="Only the JVA team sees these.">
          <input type="tel" value={value.phone} onChange={(e) => onChange({ ...value, userId: undefined, phone: e.target.value })} className={inputClass} />
        </Field>
        <button type="button" onClick={() => setManual(false)} className="text-xs font-semibold text-gold-deep hover:underline">
          Pick a member instead
        </button>
      </div>
    );
  }

  if (value.userId) {
    return (
      <div className="mt-3 rounded-lg border border-gold/40 bg-gold-soft/30 p-3">
        <div className="flex items-start gap-3">
          <Avatar name={linked?.fullName ?? value.name} size="sm" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold text-fg">{linked?.fullName ?? value.name}</p>
            <p className="truncate text-xs text-muted">{linked?.email ?? value.email}</p>
            <p className="truncate text-xs text-muted">{(linked?.phoneNumber ?? value.phone) || "No phone number"}</p>
            {linked ? <p className="mt-1 text-[0.6875rem] font-semibold text-gold-deep">{linked.role} · {linked.category}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ userId: undefined, name: "", email: "", phone: "" })}
          className="mt-2 text-xs font-semibold text-gold-deep hover:underline"
        >
          Change {role}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="relative block">
        <span className="sr-only">Search members</span>
        <FaMagnifyingGlass aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 h-3 w-3 -translate-y-1/2 text-ash" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members by name, email or phone" className={cx(inputClass, "pl-8")} />
      </label>

      {loading ? (
        <p className="text-xs text-muted">Loading members…</p>
      ) : loadError ? (
        <p className="text-xs font-medium text-danger">{loadError}</p>
      ) : matches.length === 0 ? (
        <p className="text-xs text-muted">{members.length ? "No member matches that." : "No members yet."}</p>
      ) : (
        <ul className="max-h-64 divide-y divide-fg/8 overflow-y-auto rounded-lg border border-fg/10">
          {matches.map((member) => (
            <li key={member.id}>
              <button type="button" onClick={() => onChange(fromMember(member))} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gold-soft/30">
                <Avatar name={member.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{member.fullName}</span>
                  <span className="block truncate text-xs text-muted">
                    {member.email} · {member.role}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      <button type="button" onClick={() => setManual(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-deep hover:underline">
        <FaPen aria-hidden="true" className="h-2.5 w-2.5" /> {Role} isn't a member? Enter the details manually
      </button>
    </div>
  );
}

function fromMember(member: MemberAccount): OwnerValue {
  return { userId: member.id, name: member.fullName, email: member.email, phone: member.phoneNumber };
}
