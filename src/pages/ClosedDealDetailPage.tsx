import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { FaPen } from "react-icons/fa6";
import { listings } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { ContactCard } from "@/components/ContactCard";
import { DocumentList } from "@/components/DocumentList";
import { PersonLink } from "@/components/PersonLink";
import { DealTypePill } from "@/components/StatusPills";
import { formatDateTime, formatNaira, formatSize, negotiableText, premiumText } from "@/lib/format";
import { BackLink, Card, CardTitle, Notice, PageHeader, Pill, SkeletonRows } from "@/ui";
import type { DealClosing, Listing } from "@/types";
import { coverOf } from "@/lib/videoWatermark";
import { sharingFormulaLabel } from "@/data/labels";

type ClosedListing = Listing & { closing: DealClosing };

const DAY = 24 * 60 * 60 * 1000;
const daysToClose = (deal: ClosedListing) => Math.max(0, Math.round((Date.parse(deal.closing.closedAt) - Date.parse(deal.createdAt)) / DAY));

export default function ClosedDealDetailPage() {
  const { listingId = "" } = useParams();
  const load = useCallback(() => listings.get(listingId), [listingId]);
  const { data: listing, loading, error } = useResource(load, "Couldn't load this deal.");

  const back = <BackLink to="/closed-deals">All closed deals</BackLink>;
  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={6} /></div>;
  if (error || !listing) return <div className="space-y-6">{back}<Notice tone="error">{error}</Notice></div>;
  if (!listing.closing) {
    return (
      <div className="space-y-6">
        {back}
        <Notice tone="error">This listing has no closing details yet.</Notice>
        <Link to={`/listings/${listing.id}?close=1`} className="text-sm font-semibold text-gold-deep hover:underline">
          Add the closing details
        </Link>
      </div>
    );
  }
  const deal = listing as ClosedListing;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow={`Closed deal · ${deal.id.toUpperCase()}`}
        title={deal.title}
        intro={
          <>
            Closed {formatDateTime(deal.closing.closedAt)} with{" "}
            <PersonLink name={deal.closing.counterparty.name} email={deal.closing.counterparty.email} className="font-semibold text-fg" /> for{" "}
            <span className="font-semibold text-fg">{formatNaira(deal.closing.finalAmount)}</span>
          </>
        }
        action={<Pill tone="success">Closed</Pill>}
      />
      <DealDetail deal={deal} />
    </div>
  );
}

function DealDetail({ deal }: { deal: ClosedListing }) {
  const { closing } = deal;
  const days = daysToClose(deal);
  const facts: Array<[string, string]> = [
    [deal.dealType === "jv" ? "Agreed land value" : "Final sale price", formatNaira(closing.finalAmount)],
    [deal.dealType === "jv" ? "Listed land value" : "Asking price", deal.price ? formatNaira(deal.price) : "Not set"],
    ["Facilitation fee", closing.facilitationFee ? formatNaira(closing.facilitationFee) : "None recorded"],
    ["Size", formatSize(deal.sizeSqm)],
    ["Title document", deal.titleDocument],
    ["Location", `${deal.area}, ${deal.city}, ${deal.state}`],
  ];
  if (deal.jv) {
    facts.push(
      ["Sharing formula", `${sharingFormulaLabel(deal.jv.sharingFormula)} (${negotiableText(deal.jv.sharingNegotiable).toLowerCase()})`],
      ["Premium", premiumText(deal.jv.premium)],
      ["Build period", deal.jv.duration || "Not given"],
      ["What can be built", deal.jv.proposal || "Open to proposals"],
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row">
          {coverOf(deal.images) ? <img src={coverOf(deal.images)} alt="" className="h-28 w-full shrink-0 rounded-lg object-cover sm:w-44" /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <DealTypePill dealType={deal.dealType} />
              <Pill tone="success">Closed</Pill>
            </div>
            <p className="mt-2 text-sm text-muted">
              {deal.area}, {deal.city}, {deal.state} · {formatSize(deal.sizeSqm)} · {deal.titleDocument}
            </p>
            <Link to={`/listings/${deal.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:underline">
              <FaPen aria-hidden="true" /> Edit listing or closing details
            </Link>
          </div>
        </div>

        <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-fg/8 bg-fg/8 sm:grid-cols-3">
          <li className="bg-raised p-4">
            <p className="label text-muted">Listed</p>
            <p className="mt-1.5 text-sm font-semibold text-fg">{formatDateTime(deal.createdAt)}</p>
          </li>
          <li className="bg-raised p-4">
            <p className="label text-muted">Closed</p>
            <p className="mt-1.5 text-sm font-semibold text-fg">{formatDateTime(closing.closedAt)}</p>
          </li>
          <li className="bg-raised p-4">
            <p className="label text-muted">Time to close</p>
            <p className="mt-1.5 text-sm font-semibold text-fg">
              {days} {days === 1 ? "day" : "days"}
            </p>
          </li>
        </ol>
      </Card>

      <Card>
        <CardTitle>Deal terms</CardTitle>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        {closing.notes ? (
          <div className="mt-5 border-t border-fg/8 pt-4">
            <p className="text-xs font-medium text-muted">Notes</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-fg">{closing.notes}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle hint="Signed agreements, receipts and anything else used to close.">Documents</CardTitle>
        {closing.documents.length ? (
          <DocumentList documents={closing.documents} />
        ) : (
          <p className="text-sm text-muted">No documents attached. Add them from the listing's closing details.</p>
        )}
      </Card>
    </div>

    <div className="space-y-6">
      <ContactCard
        title={deal.dealType === "jv" ? "Landowner" : "Seller"}
        name={deal.ownerName}
        email={deal.ownerEmail}
        phone={deal.ownerPhone}
        emailSubject={`${deal.title} (Joint Venture Assets)`}
      />
      <ContactCard
        title={deal.dealType === "jv" ? "Developer / investor" : "Buyer"}
        name={closing.counterparty.name}
        email={closing.counterparty.email}
        phone={closing.counterparty.phone}
        emailSubject={`${deal.title} (Joint Venture Assets)`}
      />
    </div>
    </div>
  );
}
