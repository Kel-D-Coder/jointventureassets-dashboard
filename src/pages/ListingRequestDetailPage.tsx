import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaFileContract, FaVideo, FaXmark } from "react-icons/fa6";
import { DocumentList } from "@/components/DocumentList";
import { ContactCard } from "@/components/ContactCard";
import { PersonLink } from "@/components/PersonLink";
import { listingSubmissions } from "@/lib/api";
import { useAction, useResource } from "@/hooks/useResource";
import { DealTypePill } from "@/components/StatusPills";
import { estateKind, isEstate, paymentPlanParts, priceNegotiableLabel, priceText, propertyTypeLabel, submissionStatusLabel as statusLabel, submissionStatusTone as statusTone, SHARING_TBD } from "@/data/labels";
import { cx, formatDateTime, formatNaira, formatSize, negotiableText, premiumText } from "@/lib/format";
import { BackLink, Button, Card, CardTitle, DeleteButton, Field, Notice, PageHeader, Pill, SkeletonRows, inputClass } from "@/ui";
import type { ListingSubmission, SubmittedDocument } from "@/types";
import { isVideoUrl } from "@/lib/videoWatermark";
import { joinMedia } from "@/lib/videoWatermark";

export default function ListingRequestDetailPage() {
  const { submissionId = "" } = useParams();
  const navigate = useNavigate();
  const load = useCallback(() => listingSubmissions.get(submissionId), [submissionId]);
  const { data: submission, loading, error, reload } = useResource(load, "Couldn't load this listing request.");
  const review = useAction(listingSubmissions.review, "Couldn't update this listing request.");
  const remove = useAction(listingSubmissions.remove, "Couldn't delete this listing request.");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const back = <BackLink to="/listing-requests">All listing requests</BackLink>;
  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={6} /></div>;
  if (error || !submission) return <div className="space-y-6">{back}<Notice tone="error">{error}</Notice></div>;

  const act = async (work: () => Promise<unknown>, text: string) => {
    try {
      await work();
      await reload();
      setNotice({ tone: "success", text });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  const { listing, contact } = submission;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow={`Listing request · ${submission.id.toUpperCase()}`}
        title={listing.title}
        intro={
          <>
            {listing.area}, {listing.city}, {listing.state} · from{" "}
            <PersonLink name={contact.fullName} email={contact.email} className="font-semibold text-fg" /> · {formatDateTime(submission.createdAt)}
          </>
        }
        action={<Pill tone={statusTone[submission.status]}>{statusLabel[submission.status]}</Pill>}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <SubmissionDetail
        submission={submission}
        busy={review.pending || remove.pending}
        onApprove={() => act(() => review.run(submission.id, { status: "approved", reviewNote: "Approved and published." }), "Approved. It's now live on the website.")}
        onReject={(note) => act(() => review.run(submission.id, { status: "rejected", reviewNote: note }), "Rejected. The owner will see your note.")}
        onReopen={() => act(() => review.run(submission.id, { status: "pending", reviewNote: "" }), "Moved back to pending.")}
        onDelete={async () => {
          try {
            await remove.run(submission.id);
            navigate("/listing-requests", { replace: true });
          } catch (caught) {
            setNotice({ tone: "error", text: (caught as Error).message });
          }
        }}
      />
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
  onApprove,
  onReject,
  onReopen,
  onDelete,
}: {
  submission: ListingSubmission;
  busy: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { listing, contact } = submission;
  /** Photos, then the video if there is one. */
  const media = joinMedia(listing.images, listing.videos);
  const [photo, setPhoto] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap gap-2">
          <DealTypePill dealType={listing.dealType} />
          <Pill tone={statusTone[submission.status]}>{statusLabel[submission.status]}</Pill>
        </div>

        {media.length ? (
          <div className="mt-5">
            {isVideoUrl(media[photo] ?? "") ? (
              <video key={media[photo]} src={media[photo]} controls playsInline className="aspect-16/9 w-full rounded-xl bg-ink object-contain" />
            ) : (
              <img src={media[photo]} alt={`${listing.title}, photo ${photo + 1}`} className="aspect-16/9 w-full rounded-xl object-cover" />
            )}
            {media.length > 1 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {media.map((src, index) => (
                  <button
                    key={src.slice(-24) + index}
                    type="button"
                    onClick={() => setPhoto(index)}
                    aria-label={isVideoUrl(src) ? "Show the video" : `Show photo ${index + 1}`}
                    className={cx("overflow-hidden rounded-lg border-2", index === photo ? "border-gold" : "border-transparent opacity-60 hover:opacity-100")}
                  >
                    {isVideoUrl(src) ? (
                      <span className="grid h-14 w-20 place-items-center bg-ink text-gold">
                        <FaVideo aria-hidden="true" />
                      </span>
                    ) : (
                      <img src={src} alt="" className="h-14 w-20 object-cover" />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <dl className="mt-6 grid gap-5 border-t border-fg/8 pt-5 sm:grid-cols-4">
          <Fact label={listing.dealType === "jv" ? "Land value" : "Asking price"}>{listing.landValueTbd ? "To be determined" : priceText(listing)}</Fact>
          <Fact label="Size">{listing.sizeSqm > 0 ? formatSize(listing.sizeSqm) : "Not stated"}</Fact>
          <Fact label="Type">{propertyTypeLabel[listing.propertyType]}</Fact>
          <Fact label="Title document">{listing.titleDocument}</Fact>
          {listing.jv ? (
            <>
              <Fact label="Sharing formula">{listing.jv.sharingFormula}</Fact>
              {listing.jv.sharingFormula !== SHARING_TBD ? <Fact label="Sharing negotiable">{negotiableText(listing.jv.sharingNegotiable)}</Fact> : null}
              <Fact label="Premium">{premiumText(listing.jv.premium)}</Fact>
              <Fact label="Build period">{listing.jv.duration || "Not given"}</Fact>
              <div className="sm:col-span-2">
                <Fact label="What can be built">{listing.jv.proposal || "Open to proposals"}</Fact>
              </div>
            </>
          ) : null}
          {listing.dealType === "sale" ? (
            <Fact label="Price negotiable">{listing.priceNegotiable ? priceNegotiableLabel[listing.priceNegotiable] : "Not stated"}</Fact>
          ) : null}
          {listing.dealType === "sale" ? (
            <div className="sm:col-span-2">
              <Fact label="Seller's facilitation fee">
                {listing.saleTerms?.acceptedFeeTerms
                  ? `Agreed: ${listing.saleTerms.feeRate * 100}% of the sale price (${formatNaira(Math.round(listing.price * listing.saleTerms.feeRate))} on the asking price)`
                  : "Not agreed (submitted before the fee terms were added)"}
              </Fact>
            </div>
          ) : null}
        </dl>

        {isEstate(listing) ? (
          <div className="mt-5">
            <p className="label mb-2 text-muted">{estateKind(listing) === "units" ? "Unit types & prices" : "Plot sizes & prices"}</p>
            <div className="overflow-x-auto rounded-lg border border-fg/10">
              <table className="w-full min-w-md text-left text-sm">
                <thead className="bg-surface/70 text-xs text-muted">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                    <th>{estateKind(listing) === "units" ? "Unit type" : "Plot size"}</th>
                    <th>Price</th>
                    <th>Negotiable</th>
                    <th>Initial deposit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fg/8 [&_td]:px-3 [&_td]:py-2">
                  {listing.plotOptions!.map((option, index) => (
                    <tr key={index}>
                      <td className="font-semibold text-fg">{option.label ? `${option.label}${option.sizeSqm ? ` (${formatSize(option.sizeSqm)})` : ""}` : formatSize(option.sizeSqm)}</td>
                      <td className="tabular-nums">{formatNaira(option.price)}</td>
                      <td>{option.priceNegotiable ? priceNegotiableLabel[option.priceNegotiable] : "Not stated"}</td>
                      <td className="tabular-nums">{option.deposit ? formatNaira(option.deposit) : "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentPlanParts(listing.paymentPlan).length || listing.paymentPlan?.notes ? (
              <p className="mt-3 text-sm text-fg">
                <strong>Payment plan:</strong> {[...paymentPlanParts(listing.paymentPlan), listing.paymentPlan?.notes ?? ""].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

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

    </div>

      <div className="space-y-6">
        <ContactCard
          title="Submitted by"
          name={contact.fullName}
          email={contact.email}
          phone={contact.phoneNumber}
          note={submission.isOwner ? "The owner" : `On behalf of ${listing.ownerName}`}
          emailSubject={`Your listing: ${listing.title}`}
        />

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
                <Button tone="gold" size="md" disabled={busy} onClick={onApprove}>
                  <FaCheck aria-hidden="true" /> Approve &amp; publish
                </Button>
                <p className="text-xs text-muted">Puts it live on the website. You can edit it afterwards from Listings.</p>
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
            <DeleteButton label="Delete" onConfirm={onDelete} pending={busy} />
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
      landSize: listing.sizeSqm > 0 ? listing.sizeSqm.toLocaleString("en-NG") : "",
      titleDocument: listing.titleDocument,
      landValue: listing.landValueTbd ? "" : listing.price.toLocaleString("en-NG"),
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
      landSize: listing.sizeSqm > 0 ? formatSize(listing.sizeSqm) : "",
    },
  };
}
