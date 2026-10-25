import { useState } from "react";
import { Link } from "react-router-dom";
import { FaPaperclip } from "react-icons/fa6";
import { listingSubmissions } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { PersonLink } from "@/components/PersonLink";
import { DealTypePill } from "@/components/StatusPills";
import { submissionStatusLabel, submissionStatusTone } from "@/data/labels";
import { cx, formatDateTime, formatNairaShort, timeAgo } from "@/lib/format";
import { EmptyState, Notice, PageHeader, Pill, RowLink, SkeletonRows, Table, Tabs } from "@/ui";
import type { SubmissionStatus } from "@/types";
import { coverOf } from "@/lib/videoWatermark";

type StatusFilter = Exclude<SubmissionStatus, "draft"> | "all";

export default function ListingRequestsPage() {
  const { data = [], loading, error } = useResource(listingSubmissions.list, "Couldn't load the listing requests.");
  const [status, setStatus] = useState<StatusFilter>("pending");

  const visible = data.filter((submission) => status === "all" || submission.status === status);
  const count = (value: StatusFilter) => data.filter((s) => value === "all" || s.status === value).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Listing requests"
        intro="Properties people want listed, sent from the website's “List your property” form. Open one to check it, then publish it or reject it with a note the owner will see."
      />

      <Tabs
        label="Filter by status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "Pending", count: count("pending") },
          { value: "approved", label: "Approved", count: count("approved") },
          { value: "rejected", label: "Rejected", count: count("rejected") },
          { value: "all", label: "All", count: count("all") },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : error ? null : visible.length === 0 ? (
        <EmptyState title={status === "pending" ? "All caught up" : "Nothing here"}>
          {status === "pending" ? "No listing requests are waiting for review." : "No listing requests match this filter."}
        </EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>Property</th>
              <th>Submitted by</th>
              <th>Deal</th>
              <th>Documents</th>
              <th>Status</th>
              <th>Received</th>
            </>
          }
        >
          {visible.map((submission) => {
            const { listing, contact } = submission;
            const documents = submission.documents?.length ?? 0;
            return (
              <RowLink key={submission.id} to={`/listing-requests/${submission.id}`}>
                <td>
                  <Link to={`/listing-requests/${submission.id}`} className="flex items-center gap-3">
                    {coverOf(listing.images) ? (
                      <img src={coverOf(listing.images)} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="h-10 w-12 shrink-0 rounded-md bg-surface" />
                    )}
                    <span className="min-w-0">
                      <span className={cx("block max-w-xs truncate text-fg hover:underline", submission.status === "pending" ? "font-bold" : "font-medium")}>{listing.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {listing.area}, {listing.city} · {formatNairaShort(listing.price)}
                      </span>
                    </span>
                  </Link>
                </td>
                <td>
                  <PersonLink name={contact.fullName} email={contact.email} className="font-medium text-fg" />
                  <span className="block text-xs text-muted">{submission.isOwner ? "The owner" : `For ${listing.ownerName}`}</span>
                </td>
                <td>
                  <DealTypePill dealType={listing.dealType} />
                </td>
                <td>
                  <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", documents ? "text-muted" : "text-warning")}>
                    <FaPaperclip aria-hidden="true" /> {documents}
                  </span>
                </td>
                <td>
                  <Pill tone={submissionStatusTone[submission.status]}>{submissionStatusLabel[submission.status]}</Pill>
                </td>
                <td className="whitespace-nowrap text-muted" title={formatDateTime(submission.createdAt)}>
                  {timeAgo(submission.createdAt)}
                </td>
              </RowLink>
            );
          })}
        </Table>
      )}
    </div>
  );
}
