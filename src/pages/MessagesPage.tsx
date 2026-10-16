import { useState } from "react";
import { FaEnvelope, FaPhone, FaTrashCan } from "react-icons/fa6";
import { messages } from "@/lib/mockApi";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { cx, formatDateTime, timeAgo } from "@/lib/format";
import { Button, Card, EmptyState, Notice, PageHeader, Pill, SkeletonRows } from "@/ui";
import type { ContactMessage } from "@/types";

export default function MessagesPage() {
  const { data = [], loading, error, reload } = useResource(messages.list, "Couldn't load the inbox. Try again.");
  const setRead = useAction(messages.setRead, "Couldn't update that message.");
  const remove = useAction(messages.remove, "Couldn't delete that message.");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const open = data.find((message) => message.id === openId) ?? data[0];
  const unread = data.filter((message) => !message.read).length;

  const select = async (message: ContactMessage) => {
    setOpenId(message.id);
    if (!message.read) {
      await setRead.run(message.id, true).catch(() => undefined);
      await reload();
    }
  };

  const toggleRead = async (message: ContactMessage) => {
    await setRead.run(message.id, !message.read).catch((caught: Error) => setNotice(caught.message));
    await reload();
  };

  const destroy = async (message: ContactMessage) => {
    if (!window.confirm(`Delete the message from ${message.fullName}?`)) return;
    await remove.run(message.id).catch((caught: Error) => setNotice(caught.message));
    setOpenId(null);
    await reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inbox" title="Messages" intro={`Sent through the website's contact form. ${unread} unread.`} />

      {notice ? <Notice tone="error">{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : data.length === 0 ? (
        <EmptyState title="Inbox empty">Messages from the contact page will land here.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <ul className="overflow-hidden rounded-2xl border border-fg/8 bg-raised">
            {data.map((message) => (
              <li key={message.id} className="border-b border-fg/8 last:border-0">
                <button
                  type="button"
                  onClick={() => select(message)}
                  className={cx(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                    open?.id === message.id ? "bg-gold-soft/60" : "hover:bg-surface",
                  )}
                >
                  <span className={cx("mt-2 h-2 w-2 shrink-0 rounded-full", message.read ? "bg-transparent" : "bg-gold")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("truncate text-sm text-fg", !message.read && "font-bold")}>{message.fullName}</span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(message.createdAt)}</span>
                    </span>
                    <span className={cx("block truncate text-sm", message.read ? "text-muted" : "font-semibold text-fg")}>{message.subject}</span>
                    {!message.read ? <span className="sr-only">Unread</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {open ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={open.fullName} />
                  <div>
                    <p className="font-semibold text-fg">{open.fullName}</p>
                    <p className="text-xs text-muted">{formatDateTime(open.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => toggleRead(open)} disabled={setRead.pending}>
                    Mark as {open.read ? "unread" : "read"}
                  </Button>
                  <Button tone="danger" onClick={() => destroy(open)} disabled={remove.pending}>
                    <FaTrashCan aria-hidden="true" /> <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
              <h2 className="mt-6 text-2xl text-fg">{open.subject}</h2>
              <div className="mt-2">
                <Pill tone="gold">{open.consultationType}</Pill>
              </div>
              <p className="mt-5 text-sm leading-relaxed whitespace-pre-line text-fg">{open.message}</p>
              <div className="mt-8 flex flex-wrap gap-3 border-t border-fg/8 pt-5">
                <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
                  <FaEnvelope aria-hidden="true" /> Reply by email
                </a>
                <a href={`tel:${open.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border border-fg/15 px-4 py-2.5 text-sm font-semibold hover:border-fg/40">
                  <FaPhone aria-hidden="true" /> {open.phoneNumber}
                </a>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
