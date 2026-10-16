import { useCallback, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaEnvelope, FaPhone, FaPlus, FaXmark } from "react-icons/fa6";
import { requests } from "@/lib/mockApi";
import { inboxEnquiries } from "@/lib/inboxApi";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { RequestStatusPill } from "@/components/StatusPills";
import { requestTypeLabel } from "@/data/labels";
import { formatDateTime, formatNaira, negotiableText, premiumText } from "@/lib/format";
import { Button, Card, CardTitle, Field, Notice, PageHeader, SkeletonRows, inputClass } from "@/ui";
import type { PartnerRequest } from "@/types";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  );
}

const humanise = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const loadEnquiries = () => inboxEnquiries.list().catch(() => []);

export default function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const load = useCallback(() => requests.get(requestId), [requestId]);
  const { data: request, loading, error, reload } = useResource(load, "Couldn't load this request.");
  const { run: review, pending } = useAction(requests.review, "Couldn't save the decision. Try again.");
  const [note, setNote] = useState("");
  const { data: enquiries = [] } = useResource(loadEnquiries, "");
  const enquiryCount = enquiries.filter((e) => e.target.type === "request" && e.target.id === requestId).length;
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const decide = async (status: "accepted" | "rejected") => {
    setNotice(null);
    try {
      await review(requestId, status, note);
      await reload();
      setNote("");
      setNotice({ tone: "success", text: status === "accepted" ? "Request accepted. The member will be notified." : "Request rejected. The member will be notified." });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  const back = (
    <Link to="/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
      <FaArrowLeft aria-hidden="true" /> All requests
    </Link>
  );

  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={6} /></div>;
  if (error || !request) return <div className="space-y-6">{back}<Notice tone="error">{error}</Notice></div>;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow={`${requestTypeLabel[request.requestType]} · ${request.id}`}
        title={request.title}
        intro={`Submitted ${formatDateTime(request.createdAt)}`}
        action={<RequestStatusPill status={request.status} />}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Details</CardTitle>
            <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{request.description}</p>
            <dl className="mt-6 grid gap-5 border-t border-fg/8 pt-6 sm:grid-cols-3">
              <Detail label={request.requestType === "purchase" ? "Budget" : "Budget / value"}>{formatNaira(request.budget)}</Detail>
              <Detail label="Location">{request.location}</Detail>
              <Detail label="Timeline">{request.timeline}</Detail>
              {request.landSize ? <Detail label="Land size">{request.landSize}</Detail> : null}
              {request.titleDocument ? <Detail label="Title document">{request.titleDocument}</Detail> : null}
              {request.sharingFormula ? <Detail label="Sharing formula">{request.sharingFormula}</Detail> : null}
              {request.sharingFormula ? <Detail label="Sharing negotiable">{negotiableText(request.sharingNegotiable)}</Detail> : null}
              {request.sharingFormula ? <Detail label="Premium">{premiumText(request.premium)}</Detail> : null}
              {request.developmentType ? <Detail label="Development type">{humanise(request.developmentType)}</Detail> : null}
              {request.partnershipType ? <Detail label="Partnership type">{humanise(request.partnershipType)}</Detail> : null}
              {request.propertyWanted ? <Detail label="Looking to buy">{request.propertyWanted}</Detail> : null}
              {request.paymentMethod ? <Detail label="Payment">{request.paymentMethod}</Detail> : null}
              <Detail label="Last updated">{formatDateTime(request.updatedAt)}</Detail>
            </dl>
          </Card>

          <Card>
            <CardTitle hint={request.documents.length ? "Click a file to open it full size." : undefined}>Documents & images</CardTitle>
            {request.documents.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {request.documents.map((doc, index) => (
                  <a key={doc + index} href={doc} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-fg/8">
                    <img src={doc} alt={`Document ${index + 1}`} className="aspect-4/3 w-full object-cover transition-transform group-hover:scale-105" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No documents were attached.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Submitted by</CardTitle>
            <div className="flex items-center gap-3">
              <Avatar name={request.fullName} />
              <p className="font-semibold text-fg">{request.fullName}</p>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <a href={`mailto:${request.email}`} className="flex items-center gap-2 text-muted hover:text-fg">
                <FaEnvelope aria-hidden="true" /> {request.email}
              </a>
              <a href={`tel:${request.phoneNumber.replace(/\s/g, "")}`} className="flex items-center gap-2 text-muted hover:text-fg">
                <FaPhone aria-hidden="true" /> {request.phoneNumber}
              </a>
            </div>
          </Card>

          <Card>
            <CardTitle hint="Members asking to be introduced, from Browse requests on the website.">Enquiries</CardTitle>
            <p className="font-display text-3xl text-fg">{enquiryCount}</p>
            <Link to={`/enquiries?request=${request.id}`} className="mt-2 inline-block text-sm font-semibold text-gold-deep hover:underline">
              {enquiryCount ? "View enquiries" : "Open enquiries"}
            </Link>
          </Card>

          <ReviewPanel request={request} note={note} setNote={setNote} pending={pending} decide={decide} />
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({
  request,
  note,
  setNote,
  pending,
  decide,
}: {
  request: PartnerRequest;
  note: string;
  setNote: (value: string) => void;
  pending: boolean;
  decide: (status: "accepted" | "rejected") => void;
}) {
  if (request.status !== "pending") {
    return (
      <Card>
        <CardTitle>Decision</CardTitle>
        <RequestStatusPill status={request.status} />
        <p className="mt-3 text-sm text-muted">{request.reviewNote ?? "No note was left."}</p>
        {request.status === "accepted" && request.requestType === "land" ? (
          <Link
            to="/listings/new"
            state={{ fromRequest: request }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gold/85"
          >
            <FaPlus aria-hidden="true" /> Create a listing from this
          </Link>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle hint="The member sees this note with the decision.">Review</CardTitle>
      <Field label="Note (optional)">
        <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} placeholder="e.g. Documents verified, publishing as a listing." />
      </Field>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button tone="danger" size="md" disabled={pending} onClick={() => decide("rejected")}>
          <FaXmark aria-hidden="true" /> Reject
        </Button>
        <Button tone="solid" size="md" disabled={pending} onClick={() => decide("accepted")}>
          <FaCheck aria-hidden="true" /> {pending ? "Saving…" : "Accept"}
        </Button>
      </div>
    </Card>
  );
}
