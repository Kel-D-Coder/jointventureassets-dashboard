import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { requests } from "@/lib/api";
import { inboxEnquiries } from "@/lib/api";
import { useAction, useResource } from "@/hooks/useResource";
import { ContactCard } from "@/components/ContactCard";
import { PersonLink } from "@/components/PersonLink";
import { RequestStatusPill } from "@/components/StatusPills";
import { requestTypeLabel } from "@/data/labels";
import {
  developmentTypes,
  housingProposals,
  jvPropertyKinds,
  labelOf,
  partnershipTypes,
  propertiesWanted,
  requestSummary,
  sharingFormulas,
  titleDocuments,
} from "@/lib/requestBrief";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Button, Card, CardTitle, DeleteButton, Field, Notice, PageHeader, SkeletonRows, inputClass } from "@/ui";
import type { PartnerRequest } from "@/types";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  );
}

const loadEnquiries = () => inboxEnquiries.list().catch(() => []);

export default function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const load = useCallback(() => requests.get(requestId), [requestId]);
  const { data: request, loading, error, reload } = useResource(load, "Couldn't load this request.");
  const { run: review, pending } = useAction(requests.review, "Couldn't save the decision. Try again.");
  const remove = useAction(requests.remove, "Couldn't delete this request.");
  const navigate = useNavigate();
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
        intro={
          <>
            From <PersonLink name={request.fullName} email={request.email} userId={request.userId} className="font-semibold text-fg" /> ·{" "}
            {formatDateTime(request.createdAt)}
          </>
        }
        action={<RequestStatusPill status={request.status} />}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardTitle hint="What this member wants us to find.">The brief</CardTitle>
            <p className="rounded-lg border border-gold/30 bg-gold-soft/40 p-4 text-[0.9375rem] font-medium text-fg">{requestSummary(request)}</p>
            {otherNotes(request) ? <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-fg">{otherNotes(request)}</p> : null}
            <dl className="mt-6 grid gap-5 border-t border-fg/8 pt-6 sm:grid-cols-3">
              <Detail label="Budget">{request.budget ? `Up to ${formatNaira(request.budget)}` : "Not given"}</Detail>
              <Detail label="Location">{request.location || "Not given"}</Detail>
              <Detail label="Needed by">{request.timeline || "Not given"}</Detail>
              {request.propertyWanted ? (
                <Detail label="Looking for">{labelOf(request.requestType === "jv" ? jvPropertyKinds : propertiesWanted, request.propertyWanted)}</Detail>
              ) : null}
              {request.developmentType ? <Detail label="Development">{labelOf(developmentTypes, request.developmentType)}</Detail> : null}
              {request.partnershipType ? <Detail label="Professional">{labelOf(partnershipTypes, request.partnershipType)}</Detail> : null}
              {request.landSize ? <Detail label="Size wanted">{request.landSize}</Detail> : null}
              {request.housingProposal ? <Detail label="Plans to build">{labelOf(housingProposals, request.housingProposal)}</Detail> : null}
              {request.sharingFormula ? <Detail label="Sharing formula">{labelOf(sharingFormulas, request.sharingFormula)}</Detail> : null}
              {request.premium !== undefined ? (
                <Detail label="Premium">{request.premium > 0 ? `Up to ${formatNaira(request.premium)}` : "No premium"}</Detail>
              ) : null}
              {request.titleDocument ? <Detail label="Title accepted">{labelOf(titleDocuments, request.titleDocument)}</Detail> : null}
              {request.paymentMethod ? <Detail label="Payment">{request.paymentMethod === "Instalments" ? "Installments" : request.paymentMethod}</Detail> : null}
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
          <ContactCard
            title="Submitted by"
            name={request.fullName}
            email={request.email}
            phone={request.phoneNumber}
            userId={request.userId}
            emailSubject={`Your request: ${request.title}`}
          />

          <Card>
            <CardTitle hint="Members asking to be introduced, from Browse requests on the website.">Enquiries</CardTitle>
            <p className="text-3xl font-bold text-fg tabular-nums">{enquiryCount}</p>
            <Link to={`/enquiries?request=${request.id}`} className="mt-2 inline-block text-sm font-semibold text-gold-deep hover:underline">
              {enquiryCount ? "View enquiries" : "Open enquiries"}
            </Link>
          </Card>

          <ReviewPanel request={request} note={note} setNote={setNote} pending={pending} decide={decide} />

          <Card>
            <CardTitle hint="Removes it from the server for good, including from Browse requests on the website.">Delete</CardTitle>
            <DeleteButton
              size="md"
              label="Delete request"
              pending={remove.pending}
              onConfirm={async () => {
                try {
                  await remove.run(request.id);
                  navigate("/requests", { replace: true });
                } catch (caught) {
                  setNotice({ tone: "error", text: (caught as Error).message });
                }
              }}
            />
          </Card>
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
        {request.status === "accepted" ? (
          <Link
            to="/listings"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gold/85"
          >
            <FaMagnifyingGlass aria-hidden="true" /> Find a match in listings
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

/** The description without the summary sentence it starts with, which is shown above it. */
function otherNotes(request: PartnerRequest): string {
  const summary = requestSummary(request);
  const description = request.description ?? "";
  return description.startsWith(summary) ? description.slice(summary.length).trim() : description;
}
