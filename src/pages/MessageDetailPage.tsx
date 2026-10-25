import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaEnvelope, FaPhone } from "react-icons/fa6";
import { messages } from "@/lib/api";
import { useAction, useResource } from "@/hooks/useResource";
import { ContactCard } from "@/components/ContactCard";
import { PersonLink } from "@/components/PersonLink";
import { formatDateTime } from "@/lib/format";
import { BackLink, Button, Card, CardTitle, DeleteButton, Notice, PageHeader, Pill, SkeletonRows } from "@/ui";

export default function MessageDetailPage() {
  const { messageId = "" } = useParams();
  const navigate = useNavigate();
  const load = useCallback(() => messages.get(messageId), [messageId]);
  const { data: message, loading, error, reload } = useResource(load, "Couldn't load this message.");
  const setRead = useAction(messages.setRead, "Couldn't update this message.");
  const remove = useAction(messages.remove, "Couldn't delete this message.");
  const [notice, setNotice] = useState("");

  // Opening a message marks it read.
  const unread = message ? !message.read : false;
  const markRead = setRead.run;
  useEffect(() => {
    if (unread) void markRead(messageId, true).then(reload, () => undefined);
  }, [unread, markRead, messageId, reload]);

  const back = <BackLink to="/messages">All messages</BackLink>;
  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={5} /></div>;
  if (error || !message) return <div className="space-y-6">{back}<Notice tone="error">{error}</Notice></div>;

  const toggleRead = async () => {
    await setRead.run(message.id, !message.read).catch((caught: Error) => setNotice(caught.message));
    await reload();
  };

  const destroy = async () => {
    try {
      await remove.run(message.id);
      navigate("/messages", { replace: true });
    } catch (caught) {
      setNotice((caught as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow="Contact form message"
        title={message.subject}
        intro={
          <>
            From <PersonLink name={message.fullName} email={message.email} className="font-semibold text-fg" /> · {formatDateTime(message.createdAt)}
          </>
        }
        action={<Pill tone="gold">{message.consultationType}</Pill>}
      />

      {notice ? <Notice tone="error">{notice}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardTitle>Message</CardTitle>
          <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{message.message}</p>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-fg/8 pt-5">
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
            >
              <FaEnvelope aria-hidden="true" /> Reply by email
            </a>
            {message.phoneNumber ? (
              <a href={`tel:${message.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border border-fg/15 px-4 py-2.5 text-sm font-semibold hover:border-fg/40">
                <FaPhone aria-hidden="true" /> Call {message.phoneNumber}
              </a>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <ContactCard title="From" name={message.fullName} email={message.email} phone={message.phoneNumber} emailSubject={`Re: ${message.subject}`} />
          <Card>
            <CardTitle>Actions</CardTitle>
            <div className="grid gap-2">
              <Button size="md" onClick={toggleRead} disabled={setRead.pending}>
                Mark as {message.read ? "unread" : "read"}
              </Button>
              <DeleteButton size="md" label="Delete message" onConfirm={destroy} pending={remove.pending} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
