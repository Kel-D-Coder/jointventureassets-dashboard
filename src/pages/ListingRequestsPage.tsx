import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCheck, FaEnvelope, FaFileContract, FaPaperclip, FaPhone, FaTrashCan, FaXmark } from "react-icons/fa6";
import { DocumentList } from "@/components/DocumentList";
import { listingSubmissions } from "@/lib/inboxApi";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { DealTypePill } from "@/components/StatusPills";
import { propertyTypeLabel } from "@/data/labels";
import { cx, formatDateTime, formatNaira, formatSize, timeAgo, negotiableText, premiumText } from "@/lib/format";
import { Button, Card, CardTitle, EmptyState, Field, Notice, PageHeader, Pill, SkeletonRows, Tabs, inputClass, type PillTone } from "@/ui";
import type { ListingSubmission, SubmissionStatus, SubmittedDocument } from "@/types";

type StatusFilter = Exclude<SubmissionStatus, "draft"> | "all";

const statusLabel: Record<SubmissionStatus, string> = { draft: "Draft", pending: "Pending review", approved: "Approved", rejected: "Rejected" };
const statusTone: Record<SubmissionStatus, PillTone> = { draft: "neutral", pending: "warning", approved: "success", rejected: "danger" };

export default function ListingRequestsPage() {
  const { data = [], loading, error, reload } = useResource(listingSubmissions.list, "Couldn't load the listing requests.");
  const review = useAction(listingSubmissions.review, "Couldn't update that listing request.");
  const remove = useAction(listingSubmissions.remove, "Couldn't delete that listing request.");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = data.filter((submission) => status === "all" || submission.status === status);
  const open = visible.find((submission) => submission.id === openId) ?? visible[0];
  const count = (value: StatusFilter) => data.filter((s) => value === "all" || s.status === value).length;

  const act = async (work: () => Promise<unknown>, text: string) => {
    try {
      await work();
      await reload();
      setNotice({ tone: "success", text });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Listing requests"
        intro="Properties people want listed, sent from the website's “List your property” form. Review one in the listing editor to publish it, or reject it with a note the owner will see."
      />

      <Tabs
        label="Filter by status"
        value={status}
        onChange={(value) => {
          setStatus(value);
          setOpenId(null);
        }}
        options={[
          { value: "pending", label: "Pending", count: count("pending") },
          { value: "approved", label: "Approved", count: count("approved") },
          { value: "rejected", label: "Rejected", count: count("rejected") },
          { value: "all", label: "All", count: count("all") },
        ]}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : error ? null : visible.length === 0 ? (
        <EmptyState title={status === "pending" ? "All caught up" : "Nothing here"}>
          {status === "pending" ? "No listing requests are waiting for review." : "No listing requests match this filter."}
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <ul className="overflow-hidden rounded-2xl border border-fg/8 bg-raised lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto">
            {visible.map((submission) => (
              <li key={submission.id} className="border-b border-fg/8 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenId(submission.id)}
                  className={cx("flex w-full gap-3 px-4 py-3.5 text-left transition-colors", open?.id === submission.id ? "bg-gold-soft/60" : "hover:bg-surface")}
                >
                  {submission.listing.images[0] ? (
                    <img src={submission.listing.images[0]} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-14 w-16 shrink-0 rounded-lg bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("truncate text-sm text-fg", submission.status === "pending" && "font-bold")}>{submission.listing.title}</span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(submission.createdAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {submission.contact.fullName} · {submission.listing.city}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Pill tone={statusTone[submission.status]}>{statusLabel[submission.status]}</Pill>
                      <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", submission.documents?.length ? "text-muted" : "text-warning")}>
                        <FaPaperclip aria-hidden="true" /> {submission.documents?.length ?? 0} {submission.documents?.length === 1 ? "document" : "documents"}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {open ? (
            <SubmissionDetail
              key={open.id}
              submission={open}
              busy={review.pending || remove.pending}
              onReject={(note) => act(() => review.run(open.id, { status: "rejected", reviewNote: note }), "Rejected. The owner will see your note.")}
              onReopen={() => act(() => review.run(open.id, { status: "pending", reviewNote: "" }), "Moved back to pending.")}
              onDelete={() => {
                if (!window.confirm(`Delete "${open.listing.title}"? This can't be undone.`)) return;
                setOpenId(null);
                void act(() => remove.run(open.id), "Listing request deleted.");
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

function SubmissionDetail({
  submission,
  busy,
  onReject,
  onReopen,
  onDelete,
}: {
  submission: ListingSubmission;
  busy: boolean;
  onReject: (note: string) => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { listing, contact } = submission;
  const [photo, setPhoto] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <DealTypePill dealType={listing.dealType} />
              <Pill tone={statusTone[submission.status]}>{statusLabel[submission.status]}</Pill>
            </div>
            <h2 className="mt-3 text-2xl text-fg">{listing.title}</h2>
            <p className="text-sm text-muted">
              {listing.area}, {listing.city}, {listing.state} · Ref {submission.id.toUpperCase()} · {formatDateTime(submission.createdAt)}
            </p>
          </div>
        </div>

        {listing.images.length ? (
          <div className="mt-5">
            <img src={listing.images[photo]} alt={`${listing.title}, photo ${photo + 1}`} className="aspect-16/9 w-full rounded-xl object-cover" />
            {listing.images.length > 1 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {listing.images.map((src, index) => (
                  <button
                    key={src.slice(-24) + index}
                    type="button"
                    onClick={() => setPhoto(index)}
                    aria-label={`Show photo ${index + 1}`}
                    className={cx("overflow-hidden rounded-lg border-2", index === photo ? "border-gold" : "border-transparent opacity-60 hover:opacity-100")}
                  >
                    <img src={src} alt="" className="h-14 w-20 object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <dl className="mt-6 grid gap-5 border-t border-fg/8 pt-5 sm:grid-cols-4">
          <Fact label={listing.dealType === "jv" ? "Land value" : "Asking price"}>{formatNaira(listing.price)}</Fact>
          <Fact label="Size">{formatSize(listing.sizeSqm)}</Fact>
          <Fact label="Type">{propertyTypeLabel[listing.propertyType]}</Fact>
          <Fact label="Title document">{listing.titleDocument}</Fact>
          {listing.jv ? (
            <>
              <Fact label="Sharing formula">{listing.jv.sharingFormula}</Fact>
              <Fact label="Sharing negotiable">{negotiableText(listing.jv.sharingNegotiable)}</Fact>
              <Fact label="Premium">{premiumText(listing.jv.premium)}</Fact>
              <Fact label="Build period">{listing.jv.duration || "Not given"}</Fact>
              <div className="sm:col-span-2">
                <Fact label="Proposal">{listing.jv.proposal || "No"}</Fact>
              </div>
            </>
          ) : null}
        </dl>

        <p className="mt-6 text-sm leading-relaxed whitespace-pre-line text-fg">{listing.description}</p>
        {listing.highlights.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {listing.highlights.map((highlight) => (
              <li key={highlight}>
                <Pill tone="gold">{highlight}</Pill>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <TitleDocuments documents={submission.documents ?? []} titleDocument={listing.titleDocument} />

      {listing.dealType === "jv" ? (
        <Card>
          <CardTitle hint="Opens the template with this request's details filled in.">Documents to prepare</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-fg/8 p-4">
              <p className="font-semibold text-fg">Letter of Intent</p>
              <p className="mt-1 text-sm text-muted">Prepared for the developer, addressed to this landowner.</p>
              <div className="mt-3">
                <Button onClick={() => navigate("/templates/loi", { state: loiPrefill(submission) })}>
                  <FaFileContract aria-hidden="true" /> Prepare their LOI
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-fg/8 p-4">
              <p className="font-semibold text-fg">Facilitation Fee Agreement</p>
              <p className="mt-1 text-sm text-muted">Always prepared by us.</p>
              <div className="mt-3">
                <Button onClick={() => navigate("/templates/facilitation", { state: facilitationPrefill(submission) })}>
                  <FaFileContract aria-hidden="true" /> Prepare agreement
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardTitle>Submitted by</CardTitle>
          <div className="flex items-center gap-3">
            <Avatar name={contact.fullName} />
            <div>
              <p className="font-semibold text-fg">{contact.fullName}</p>
              <p className="text-xs text-muted">{submission.isOwner ? "The owner" : `On behalf of ${listing.ownerName}`}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Your listing: ${listing.title}`)}`} className="flex items-center gap-2 text-muted hover:text-fg">
              <FaEnvelope aria-hidden="true" /> {contact.email}
            </a>
            <a href={`tel:${contact.phoneNumber.replace(/\s/g, "")}`} className="flex items-center gap-2 text-muted hover:text-fg">
              <FaPhone aria-hidden="true" /> {contact.phoneNumber}
            </a>
          </div>
        </Card>

        <Card>
          <CardTitle>Decision</CardTitle>
          {submission.status === "pending" ? (
            rejecting ? (
              <div className="space-y-3">
                <Field label="Note for the owner" hint="Say what's missing so they can resubmit.">
                  <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} autoFocus />
                </Field>
                <div className="flex gap-2">
                  <Button tone="danger" disabled={busy || !note.trim()} onClick={() => onReject(note.trim())}>
                    Confirm rejection
                  </Button>
                  <Button onClick={() => setRejecting(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button tone="gold" size="md" disabled={busy} onClick={() => navigate("/listings/new", { state: { fromSubmission: submission } })}>
                  <FaCheck aria-hidden="true" /> Review &amp; publish
                </Button>
                <p className="text-xs text-muted">Opens the listing editor with these details filled in. It&apos;s marked approved when you publish.</p>
                <Button size="md" tone="danger" disabled={busy} onClick={() => setRejecting(true)}>
                  <FaXmark aria-hidden="true" /> Reject
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3 text-sm">
              <Pill tone={statusTone[submission.status]}>{statusLabel[submission.status]}</Pill>
              {submission.reviewNote ? <p className="text-muted">{submission.reviewNote}</p> : null}
              {submission.listingId ? (
                <Link to={`/listings/${submission.listingId}`} className="block font-semibold text-gold-deep hover:underline">
                  Open the listing
                </Link>
              ) : null}
              <Button disabled={busy} onClick={onReopen}>
                Move back to pending
              </Button>
            </div>
          )}
          <div className="mt-5 border-t border-fg/8 pt-4">
            <Button tone="danger" disabled={busy} onClick={onDelete}>
              <FaTrashCan aria-hidden="true" /> Delete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TitleDocuments({ documents, titleDocument }: { documents: SubmittedDocument[]; titleDocument: string }) {
  return (
    <Card>
      <CardTitle hint={`Stated title: ${titleDocument}. Check these before publishing, then tick "Documents verified" in the editor.`}>
        Title documents ({documents.length})
      </CardTitle>
      {documents.length === 0 ? (
        <p className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
          No documents were uploaded with this request. Ask the owner for them before publishing.
        </p>
      ) : (
        <DocumentList documents={documents} />
      )}
    </Card>
  );
}

const locationOf = (listing: ListingSubmission["listing"]) => `${listing.area}, ${listing.city}, ${listing.state} State`;

/** LOI fields that can come straight from a listing request: the landowner and the property. */
function loiPrefill(submission: ListingSubmission) {
  const { listing, contact } = submission;
  const [landownerShare = "", developerShare = ""] = (listing.jv?.sharingFormula ?? "").split("/");
  return {
    source: `${contact.fullName}'s listing request`,
    prefill: {
      landownerName: listing.ownerName,
      contactPerson: contact.fullName,
      landownerPhone: contact.phoneNumber,
      landownerEmail: contact.email,
      landownerSignatory: submission.isOwner ? contact.fullName : listing.ownerName,
      propertyAddress: `${listing.area}, ${listing.city}`,
      propertyLocation: locationOf(listing),
      landSize: listing.sizeSqm.toLocaleString("en-NG"),
      titleDocument: listing.titleDocument,
      landValue: listing.price.toLocaleString("en-NG"),
      propertyDescription: listing.description,
      projectDescription: listing.jv?.proposal ?? "",
      developmentPeriod: listing.jv?.duration ?? "",
      landownerShare,
      developerShare,
      sharingRatio: listing.jv?.sharingFormula ?? "",
    },
  };
}

/** The facilitation agreement only needs the property from the request; the client is the developer. */
function facilitationPrefill(submission: ListingSubmission) {
  const { listing, contact } = submission;
  return {
    source: `${contact.fullName}'s listing request`,
    prefill: {
      propertyDescription: listing.title,
      propertyLocation: locationOf(listing),
      landSize: formatSize(listing.sizeSqm),
    },
  };
}
