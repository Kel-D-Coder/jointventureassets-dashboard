import { Link } from "react-router-dom";
import { messages } from "@/lib/mockApi";
import { useResource } from "@/hooks/useResource";
import { PersonLink } from "@/components/PersonLink";
import { cx, formatDateTime, timeAgo } from "@/lib/format";
import { EmptyState, Notice, PageHeader, Pill, RowLink, SkeletonRows, Table } from "@/ui";

export default function MessagesPage() {
  const { data = [], loading, error } = useResource(messages.list, "Couldn't load the inbox. Try again.");
  const unread = data.filter((message) => !message.read).length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inbox" title="Messages" intro={`Sent through the website's contact form. ${unread} unread.`} />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : data.length === 0 ? (
        <EmptyState title="Inbox empty">Messages from the contact page will land here.</EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>From</th>
              <th>Subject</th>
              <th>Topic</th>
              <th>Received</th>
            </>
          }
        >
          {data.map((message) => (
            <RowLink key={message.id} to={`/messages/${message.id}`}>
              <td>
                <span className="flex items-center gap-2.5">
                  <span className={cx("h-2 w-2 shrink-0 rounded-full", message.read ? "bg-transparent" : "bg-gold")} aria-hidden="true" />
                  <span className="min-w-0">
                    <PersonLink name={message.fullName} email={message.email} className={cx("block truncate text-fg", message.read ? "font-medium" : "font-bold")} />
                    <span className="block max-w-56 truncate text-xs text-muted">{message.email}</span>
                  </span>
                </span>
              </td>
              <td>
                <Link to={`/messages/${message.id}`} className={cx("block max-w-md truncate hover:underline", message.read ? "text-muted" : "font-semibold text-fg")}>
                  {message.subject}
                  {!message.read ? <span className="sr-only"> (unread)</span> : null}
                </Link>
              </td>
              <td>
                <Pill tone="gold">{message.consultationType}</Pill>
              </td>
              <td className="whitespace-nowrap text-muted" title={formatDateTime(message.createdAt)}>
                {timeAgo(message.createdAt)}
              </td>
            </RowLink>
          ))}
        </Table>
      )}
    </div>
  );
}
