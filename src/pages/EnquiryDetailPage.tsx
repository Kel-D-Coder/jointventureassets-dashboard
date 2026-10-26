import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowUpRightFromSquare, FaBuilding, FaCircleCheck, FaEnvelope, FaFileContract, FaFileSignature, FaPhone } from "react-icons/fa6";
import { inboxEnquiries } from "@/lib/api";
import { listings, requests } from "@/lib/api";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { ContactCard } from "@/components/ContactCard";
import { DocumentList } from "@/components/DocumentList";
import { PersonLink } from "@/components/PersonLink";
import { DealTypePill } from "@/components/StatusPills";
import { websiteUrl } from "@/data/site";
import { documentTemplates } from "@/data/templates";
import { priceText, sharingFormulaLabel, enquiryStatusLabel, enquiryStatusTone } from "@/data/labels";
import { formatDateTime } from "@/lib/format";
import { BackLink, Button, Card, CardTitle, DeleteButton, Notice, PageHeader, Pill, SkeletonRows } from "@/ui";
import type { EnquiryStatus, InboxEnquiry, Listing, PartnerRequest } from "@/types";
import { coverOf } from "@/lib/videoWatermark";

/** The enquiry, plus the listing or request it's about when that still exists here. */
async function loadEnquiry(id: string) {
  const enquiry = await inboxEnquiries.get(id);
  const [listing, request] = await Promise.all([
    enquiry.target.type === "listing" ? listings.get(enquiry.target.id).catch(() => undefined) : undefined,
    enquiry.target.type === "request" ? requests.get(enquiry.target.id).catch(() => undefined) : undefined,
  ]);
  return { enquiry, listing, request };
}

export default function EnquiryDetailPage() {
  const { enquiryId = "" } = useParams();
  const navigate = useNavigate();
  const load = useCallback(() => loadEnquiry(enquiryId), [enquiryId]);
  const { data, loading, error, reload } = useResource(load, "Couldn't load this enquiry.");
  const setStatus = useAction(inboxEnquiries.setStatus, "Couldn't update this enquiry.");
  const remove = useAction(inboxEnquiries.remove, "Couldn't delete this enquiry.");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const back = <BackLink to="/enquiries">All enquiries</BackLink>;
  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={6} /></div>;
  if (error || !data) return <div className="space-y-6">{back}<Notice tone="error">{error}</Notice></div>;

  const { enquiry, listing, request } = data;
  const { target } = enquiry;
  const busy = setStatus.pending || remove.pending;

  const changeStatus = async (next: EnquiryStatus) => {
    try {
      await setStatus.run(enquiry.id, next);
      await reload();
      setNotice({ tone: "success", text: `Marked as ${enquiryStatusLabel[next].toLowerCase()}.` });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  const destroy = async () => {
    try {
      await remove.run(enquiry.id);
      navigate("/enquiries", { replace: true });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow={`Enquiry about ${target.type === "listing" ? "a listing" : "a member's request"}`}
        title={target.title}
        intro={
          <>
            From <PersonLink name={enquiry.fullName} email={enquiry.email} className="font-semibold text-fg" /> · {formatDateTime(enquiry.createdAt)}
          </>
        }
        action={<Pill tone={enquiryStatusTone[enquiry.status]}>{enquiryStatusLabel[enquiry.status]}</Pill>}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={enquiry.fullName} />
              <div>
                <PersonLink name={enquiry.fullName} email={enquiry.email} className="font-semibold text-fg" />
                <p className="text-xs text-muted">{formatDateTime(enquiry.createdAt)}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed whitespace-pre-line text-fg">{enquiry.message}</p>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-fg/8 pt-5">
              <a
                href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${target.title} (Joint Venture Assets)`)}`}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
              >
                <FaEnvelope aria-hidden="true" /> Reply by email
              </a>
              {enquiry.phoneNumber ? (
                <a href={`tel:${enquiry.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border border-fg/15 px-4 py-2.5 text-sm font-semibold hover:border-fg/40">
                  <FaPhone aria-hidden="true" /> Call {enquiry.phoneNumber}
                </a>
              ) : null}
            </div>
          </Card>

          {enquiry.jv ? <JvTermsCard enquiry={enquiry} jv={enquiry.jv} listing={listing} /> : null}

          <SubjectCard enquiry={enquiry} listing={listing} request={request} />
        </div>

        <div className="space-y-6">
          <ContactCard title="From" name={enquiry.fullName} email={enquiry.email} phone={enquiry.phoneNumber} emailSubject={`Re: ${target.title}`} />

          <Card>
            <CardTitle>Status</CardTitle>
            <Pill tone={enquiryStatusTone[enquiry.status]}>{enquiryStatusLabel[enquiry.status]}</Pill>
            <div className="mt-4 grid gap-2">
              {(["new", "contacted", "closed"] as EnquiryStatus[])
                .filter((next) => next !== enquiry.status)
                .map((next) => (
                  <Button key={next} size="md" disabled={busy} onClick={() => changeStatus(next)}>
                    Mark as {enquiryStatusLabel[next].toLowerCase()}
                  </Button>
                ))}
            </div>
            <div className="mt-5 border-t border-fg/8 pt-4">
              <DeleteButton label="Delete enquiry" onConfirm={destroy} pending={remove.pending} disabled={busy} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubjectCard({ enquiry, listing, request }: { enquiry: InboxEnquiry; listing?: Listing; request?: PartnerRequest }) {
  const { target } = enquiry;
  const image = (listing ? coverOf(listing.images) : undefined) ?? target.image;
  return (
    <Card>
      <CardTitle>About</CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row">
        {image ? (
          <img src={image} alt="" className="h-28 w-full shrink-0 rounded-lg bg-surface object-cover sm:w-44" />
        ) : (
          <span className="grid h-28 w-full shrink-0 place-items-center rounded-lg bg-surface text-3xl text-gold-deep sm:w-44">
            {target.type === "request" ? <FaFileSignature aria-hidden="true" /> : <FaBuilding aria-hidden="true" />}
          </span>
        )}
        <div className="min-w-0">
          {listing ? <DealTypePill dealType={listing.dealType} /> : <Pill>{target.type === "request" ? "Member request" : "Listing"}</Pill>}
          <p className="mt-2 text-lg font-semibold text-fg">{target.title}</p>
          <p className="text-sm text-muted">
            {listing
              ? `${listing.area}, ${listing.city} · ${priceText(listing, true)}${listing.jv ? ` · ${sharingFormulaLabel(listing.jv.sharingFormula)} sharing` : ""}`
              : (target.subtitle ?? "")}
          </p>
          {request ? (
            <p className="mt-1 text-sm text-muted">
              Posted by <PersonLink name={request.fullName} email={request.email} userId={request.userId} className="font-semibold text-fg" />
            </p>
          ) : null}
          {listing ? (
            <p className="mt-1 text-sm text-muted">
              Owner: <PersonLink name={listing.ownerName} email={listing.ownerEmail} className="font-semibold text-fg" />
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <Link to={`/enquiries?${target.type}=${encodeURIComponent(target.id)}`} className="text-gold-deep hover:underline">
              All enquiries for this {target.type}
            </Link>
            {listing ? (
              <Link to={`/listings/${listing.id}`} className="text-muted hover:text-fg">
                Open listing
              </Link>
            ) : null}
            {request ? (
              <Link to={`/requests/${request.id}`} className="text-muted hover:text-fg">
                Open request
              </Link>
            ) : null}
            {target.type === "listing" ? (
              <a href={websiteUrl(`/listings/${target.id}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
                View on website <FaArrowUpRightFromSquare aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** What a joint-venture enquirer answered on the website, with shortcuts to the documents JVA prepares. */
function JvTermsCard({ enquiry, jv, listing }: { enquiry: InboxEnquiry; jv: NonNullable<InboxEnquiry["jv"]>; listing?: Listing }) {
  const navigate = useNavigate();
  const source = `${enquiry.fullName}'s enquiry`;

  return (
    <Card>
      <CardTitle hint="Answered on the website's joint venture enquiry form.">Joint venture terms</CardTitle>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-fg/8 p-4">
          <dt className="label text-muted">Letter of Intent</dt>
          <dd className="mt-2">
            <Pill tone={jv.generateLoi ? "gold" : "neutral"}>{jv.generateLoi ? "Wants us to prepare it" : "Will provide their own"}</Pill>
            <p className="mt-2 text-sm text-muted">
              {jv.generateLoi
                ? "Prepared on their letterhead, addressed to this listing's landowner."
                : "Ask them to send their LOI when they're ready to move forward."}
            </p>
          </dd>
        </div>
        <div className="rounded-xl border border-fg/8 p-4">
          <dt className="label text-muted">Facilitation fee terms</dt>
          <dd className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <FaCircleCheck aria-hidden="true" /> Accepted
            </span>
            <p className="mt-2 text-sm text-muted">Agreed that JVA prepares the Facilitation Fee Agreement at 10% of the land value, non-negotiable.</p>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="label mb-2 text-muted">Company letterhead</p>
        {jv.letterhead ? (
          <div className="space-y-3">
            <img src={jv.letterhead.url} alt={`${enquiry.fullName}'s letterhead`} className="w-full rounded-lg border border-fg/8 bg-white" />
            <DocumentList documents={[jv.letterhead]} />
          </div>
        ) : (
          <p className="text-sm text-muted">{jv.generateLoi ? "Not uploaded." : "Not needed, as they're providing their own LOI."}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-fg/8 pt-5">
        {jv.generateLoi ? (
          <Button tone="gold" onClick={() => navigate("/templates/loi", { state: { source, prefill: loiPrefill(enquiry, listing) } })}>
            <FaFileContract aria-hidden="true" /> Prepare their LOI
          </Button>
        ) : null}
        <Button onClick={() => navigate("/templates/facilitation", { state: { source, prefill: facilitationPrefill(enquiry, listing) } })}>
          <FaFileContract aria-hidden="true" /> Prepare facilitation agreement
        </Button>
      </div>
    </Card>
  );
}

/** The template's own listing mappings fill in the property; the enquirer is the developer. */
function fromListing(templateId: string, listing?: Listing): Record<string, string> {
  const template = documentTemplates.find((candidate) => candidate.id === templateId);
  if (!template || !listing) return {};
  return Object.fromEntries(template.fields.filter((field) => field.fromListing).map((field) => [field.key, field.fromListing!(listing)]));
}

const loiPrefill = (enquiry: InboxEnquiry, listing?: Listing) => ({
  ...fromListing("loi", listing),
  developerName: enquiry.fullName,
  ...(enquiry.jv?.letterhead ? { developerLetterhead: enquiry.jv.letterhead.url } : {}),
  developerPhone: enquiry.phoneNumber,
  developerEmail: enquiry.email,
  ...(listing ? { landownerName: listing.ownerName } : {}),
});

const facilitationPrefill = (enquiry: InboxEnquiry, listing?: Listing) => ({
  ...fromListing("facilitation", listing),
  clientName: enquiry.fullName,
});
