import { useEffect, useMemo, useRef, useState } from "react";
import { FaPaperPlane, FaXmark } from "react-icons/fa6";
import { accounts, sendDocumentForSignature } from "@/lib/inboxApi";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/format";
import { Button, Field, Notice, inputClass } from "@/ui";
import type { MemberAccount } from "@/types";

export interface SentRecord {
  memberName: string;
  email: string;
  documentName: string;
  sentAt: string;
}

/**
 * Picks a member and sends them the filled-in document to sign. The member
 * whose name matches the document (e.g. the client or landowner) is preselected.
 */
export function SendForSignatureDialog({
  templateId,
  documentName,
  values,
  suggestedName,
  missing,
  onClose,
  onSent,
}: {
  templateId: string;
  documentName: string;
  values: Record<string, string>;
  /** A name from the document to preselect the matching member. */
  suggestedName: string;
  /** Labels of required fields still blank; sending waits until there are none. */
  missing: string[];
  onClose: () => void;
  onSent: (record: SentRecord) => void;
}) {
  const [members, setMembers] = useState<MemberAccount[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    accounts
      .list()
      .then((list) => {
        setMembers(list);
        const match = list.find((member) => suggestedName && member.fullName.toLowerCase() === suggestedName.trim().toLowerCase());
        if (match) setSelectedId(match.id);
      })
      .catch((caught: Error) => setLoadError(caught.message));
  }, [suggestedName]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (members ?? []).filter(
      (member) => member.status !== "suspended" && (!needle || [member.fullName, member.email, member.role].join(" ").toLowerCase().includes(needle)),
    );
  }, [members, query]);

  const selected = members?.find((member) => member.id === selectedId);

  const send = async () => {
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      await sendDocumentForSignature({
        templateId,
        documentName,
        memberId: selected.id,
        memberName: selected.fullName,
        email: selected.email,
        message: message.trim(),
        values,
      });
      onSent({ memberName: selected.fullName, email: selected.email, documentName, sentAt: new Date().toISOString() });
    } catch (caught) {
      setError((caught as Error).message || "Couldn't send the document.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden" onMouseDown={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Send for signature"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-raised shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-fg/8 p-6">
          <div>
            <h2 className="text-2xl text-fg">Send for signature</h2>
            <p className="mt-1 text-sm text-muted">{documentName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg">
            <FaXmark aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {missing.length ? (
            <Notice tone="error">
              Fill in these first: {missing.join(", ")}.
            </Notice>
          ) : null}
          {loadError ? <Notice tone="error">{loadError}</Notice> : null}

          <Field label="Member">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or role" className={inputClass} />
          </Field>
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-fg/10" role="listbox" aria-label="Members">
            {members === null && !loadError ? <li className="px-4 py-3 text-sm text-muted">Loading members…</li> : null}
            {members !== null && visible.length === 0 ? <li className="px-4 py-3 text-sm text-muted">No members match.</li> : null}
            {visible.map((member) => (
              <li key={member.id} role="option" aria-selected={member.id === selectedId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  className={cx(
                    "flex w-full items-center gap-3 border-b border-fg/8 px-4 py-3 text-left last:border-0",
                    member.id === selectedId ? "bg-gold-soft/60" : "hover:bg-surface",
                  )}
                >
                  <Avatar name={member.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{member.fullName}</span>
                    <span className="block truncate text-xs text-muted">
                      {member.role} · {member.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Field label="Message (optional)" hint="Shown in the email above the signing link.">
            <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className={inputClass} placeholder="e.g. Please review and sign the attached agreement." />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fg/8 p-6">
          <p className="text-xs text-muted">{selected ? `To ${selected.email}` : "Choose who should sign."}</p>
          <div className="flex gap-2">
            <Button size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button size="md" tone="solid" disabled={!selected || sending || missing.length > 0} onClick={send}>
              <FaPaperPlane aria-hidden="true" /> {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
