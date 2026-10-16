import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowUpRightFromSquare, FaBuilding, FaCircleCheck, FaEnvelope, FaFileContract, FaFileSignature, FaPhone, FaTrashCan } from "react-icons/fa6";
import { inboxEnquiries } from "@/lib/inboxApi";
import { listings, requests } from "@/lib/mockApi";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { DocumentList } from "@/components/DocumentList";
import { DealTypePill } from "@/components/StatusPills";
import { websiteUrl } from "@/data/site";
import { documentTemplates } from "@/data/templates";
import { cx, formatDateTime, formatNairaShort, timeAgo } from "@/lib/format";
import { Button, Card, CardTitle, EmptyState, Notice, PageHeader, Pill, SkeletonRows, Tabs, inputClass, type PillTone } from "@/ui";
import type { EnquiryStatus, InboxEnquiry, Listing, PartnerRequest } from "@/types";

type StatusFilter = EnquiryStatus | "all";
type LoiFilter = "all" | "wants" | "own";
type AboutFilter = InboxEnquiry["target"]["type"] | "all";

const statusLabel: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
const statusTone: Record<EnquiryStatus, PillTone> = { new: "gold", contacted: "info", closed: "neutral" };

const loadLocal = async () => {
  const [allListings, allRequests] = await Promise.all([listings.list(), requests.list()]);
  return {
    listingById: new Map(allListings.map((listing) => [listing.id, listing])),
    requestById: new Map(allRequests.map((request) => [request.id, request])),
  };
};

export default function EnquiriesPage() {
  const inbox = useResource(inboxEnquiries.list, "Couldn't load the enquiries.");
  const local = useResource(loadLocal, "Couldn't load listings and requests.");
  const setStatus = useAction(inboxEnquiries.setStatus, "Couldn't update that enquiry.");
  const remove = useAction(inboxEnquiries.remove, "Couldn't delete that enquiry.");
  const [params, setParams] = useSearchParams();
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [loi, setLoi] = useState<LoiFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // ?listing=lst-1001 or ?request=req-2001 shows one item's enquiries.
  const subject = params.get("listing") ? `listing:${params.get("listing")}` : params.get("request") ? `request:${params.get("request")}` : "";
  const about: AboutFilter = subject ? (subject.split(":")[0] as AboutFilter) : ((params.get("about") as AboutFilter) ?? "all");

  const all = useMemo(() => inbox.data ?? [], [inbox.data]);

  // Every listing and request that has enquiries, busiest first, for the "which one" dropdown.
  const subjects = useMemo(() => {
    const byKey = new Map<string, { key: string; type: AboutFilter; title: string; count: number }>();
    for (const enquiry of all) {
      const key = `${enquiry.target.type}:${enquiry.target.id}`;
      const entry = byKey.get(key) ?? { key, type: enquiry.target.type, title: enquiry.target.title, count: 0 };
      entry.count += 1;
      byKey.set(key, entry);
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count);
  }, [all]);

  const matchesScope = useCallback(
    (enquiry: InboxEnquiry) =>
      (about === "all" || enquiry.target.type === about) && (!subject || `${enquiry.target.type}:${enquiry.target.id}` === subject),
    [about, subject],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter(
      (enquiry) =>
        matchesScope(enquiry) &&
        (status === "all" || enquiry.status === status) &&
        matchesLoi(enquiry, loi) &&
        (!needle || [enquiry.fullName, enquiry.email, enquiry.message, enquiry.target.title].join(" ").toLowerCase().includes(needle)),
    );
  }, [all, matchesScope, status, loi, query]);

  const open = visible.find((enquiry) => enquiry.id === openId) ?? visible[0];
  const count = (value: StatusFilter) => all.filter((e) => matchesScope(e) && (value === "all" || e.status === value)).length;
  const aboutCount = (value: AboutFilter) => all.filter((e) => value === "all" || e.target.type === value).length;
  const loiCount = (value: LoiFilter) => all.filter((e) => matchesScope(e) && (status === "all" || e.status === status) && matchesLoi(e, value)).length;
  const hasJv = all.some((enquiry) => enquiry.jv);

  const chooseAbout = (value: AboutFilter) => {
    setOpenId(null);
    setParams(value === "all" ? {} : { about: value });
  };

  const chooseSubject = (key: string) => {
    setOpenId(null);
    if (!key) return setParams(about === "all" ? {} : { about });
    const [type, id] = key.split(":");
    setParams({ [type!]: id! });
  };

  const changeStatus = async (enquiry: InboxEnquiry, next: EnquiryStatus) => {
    await setStatus.run(enquiry.id, next).catch((caught: Error) => setNotice(caught.message));
    await inbox.reload();
  };

  const destroy = async (enquiry: InboxEnquiry) => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.fullName}?`)) return;
    await remove.run(enquiry.id).catch((caught: Error) => setNotice(caught.message));
    setOpenId(null);
    await inbox.reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Enquiries"
        intro={`Sent from the website: about a listing, or about another member's request. ${all.filter((e) => e.status === "new").length} waiting for a reply.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="What the enquiry is about"
          value={about}
          onChange={chooseAbout}
          options={[
            { value: "all", label: "Everything", count: aboutCount("all") },
            { value: "listing", label: "Listings", count: aboutCount("listing") },
            { value: "request", label: "Requests", count: aboutCount("request") },
          ]}
        />
        <select aria-label="Show enquiries for one listing or request" value={subject} onChange={(event) => chooseSubject(event.target.value)} className={`${inputClass} w-auto! max-w-xs`}>
          <option value="">{about === "request" ? "All requests" : about === "listing" ? "All listings" : "All listings and requests"}</option>
          {(["listing", "request"] as const)
            .filter((type) => about === "all" || about === type)
            .map((type) => (
              <optgroup key={type} label={type === "listing" ? "Listings" : "Requests"}>
                {subjects
                  .filter((item) => item.type === type)
                  .map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title} ({item.count})
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Filter by status"
          value={status}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "new", label: "New", count: count("new") },
            { value: "contacted", label: "Contacted", count: count("contacted") },
            { value: "closed", label: "Closed", count: count("closed") },
          ]}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email or message"
          aria-label="Search enquiries"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {hasJv ? (
        <Tabs
          label="Filter by LOI answer"
          value={loi}
          onChange={setLoi}
          options={[
            { value: "all", label: "Any LOI answer", count: loiCount("all") },
            { value: "wants", label: "Wants us to prepare LOI", count: loiCount("wants") },
            { value: "own", label: "Providing their own LOI", count: loiCount("own") },
          ]}
        />
      ) : null}

      {notice ? <Notice tone="error">{notice}</Notice> : null}
      {inbox.error ? <Notice tone="error">{inbox.error}</Notice> : null}

      {inbox.loading ? (
        <SkeletonRows />
      ) : inbox.error ? null : visible.length === 0 ? (
        <EmptyState title="No enquiries">Nothing matches these filters.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
          <ul className="overflow-hidden rounded-2xl border border-fg/8 bg-raised lg:max-h-[calc(100svh-18rem)] lg:overflow-y-auto">
            {visible.map((enquiry) => (
              <li key={enquiry.id} className="border-b border-fg/8 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenId(enquiry.id)}
                  className={cx("flex w-full gap-3 px-4 py-3.5 text-left transition-colors", open?.id === enquiry.id ? "bg-gold-soft/60" : "hover:bg-surface")}
                >
                  <SubjectThumb enquiry={enquiry} listing={local.data?.listingById.get(enquiry.target.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("truncate text-sm text-fg", enquiry.status === "new" && "font-bold")}>{enquiry.fullName}</span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(enquiry.createdAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{enquiry.target.title}</span>
                    <span className="mt-1 flex gap-1.5">
                      <Pill tone={statusTone[enquiry.status]}>{statusLabel[enquiry.status]}</Pill>
                      <Pill>{enquiry.target.type === "listing" ? "Listing" : "Request"}</Pill>
                      {enquiry.jv ? <Pill tone={enquiry.jv.generateLoi ? "gold" : "neutral"}>{enquiry.jv.generateLoi ? "Wants LOI" : "Own LOI"}</Pill> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {open ? (
            <EnquiryDetail
              enquiry={open}
              listing={open.target.type === "listing" ? local.data?.listingById.get(open.target.id) : undefined}
              request={open.target.type === "request" ? local.data?.requestById.get(open.target.id) : undefined}
              busy={setStatus.pending || remove.pending}
              onStatus={changeStatus}
              onDelete={destroy}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function SubjectThumb({ enquiry, listing }: { enquiry: InboxEnquiry; listing?: Listing }) {
  const image = listing?.images[0] ?? enquiry.target.image;
  if (image) return <img src={image} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" />;
  return (
    <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-surface text-ash">
      {enquiry.target.type === "request" ? <FaFileSignature aria-hidden="true" /> : <FaBuilding aria-hidden="true" />}
    </span>
  );
}

function EnquiryDetail({
  enquiry,
  listing,
  request,
  busy,
  onStatus,
  onDelete,
}: {
  enquiry: InboxEnquiry;
  listing?: Listing;
  request?: PartnerRequest;
  busy: boolean;
  onStatus: (enquiry: InboxEnquiry, status: EnquiryStatus) => void;
  onDelete: (enquiry: InboxEnquiry) => void;
}) {
  const { target } = enquiry;
  const subject = `Re: ${target.title} (Joint Venture Assets)`;
  const allForThis = `/enquiries?${target.type}=${encodeURIComponent(target.id)}`;

  return (
    <div className="space-y-5">
      <Card>
        <p className="label text-muted">Enquiry about {target.type === "listing" ? "a listing" : "a member's request"}</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          {target.type === "listing" ? (
            <img
              src={listing?.images[0] ?? target.image}
              alt=""
              className="h-28 w-full shrink-0 rounded-xl bg-surface object-cover sm:w-44"
            />
          ) : (
            <span className="grid h-28 w-full shrink-0 place-items-center rounded-xl bg-surface text-3xl text-gold-deep sm:w-44">
              <FaFileSignature aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {listing ? <DealTypePill dealType={listing.dealType} /> : <Pill>{target.type === "request" ? "Member request" : "Listing"}</Pill>}
            <p className="mt-2 font-display text-xl text-fg">{target.title}</p>
            <p className="text-sm text-muted">
              {listing
                ? `${listing.area}, ${listing.city} · ${formatNairaShort(listing.price)}${listing.jv ? ` · ${listing.jv.sharingFormula} sharing` : ""}`
                : (target.subtitle ?? "")}
            </p>
            {request ? <p className="mt-1 text-sm text-muted">Posted by {request.fullName}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
              <Link to={allForThis} className="text-gold-deep hover:underline">
                All enquiries for this {target.type}
              </Link>
              {listing ? (
                <Link to={`/listings/${listing.id}`} className="text-muted hover:text-fg">
                  Edit listing
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

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={enquiry.fullName} />
            <div>
              <p className="font-semibold text-fg">{enquiry.fullName}</p>
              <p className="text-xs text-muted">{formatDateTime(enquiry.createdAt)}</p>
            </div>
          </div>
          <Pill tone={statusTone[enquiry.status]}>{statusLabel[enquiry.status]}</Pill>
        </div>

        <p className="mt-5 text-sm leading-relaxed whitespace-pre-line text-fg">{enquiry.message}</p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-fg/8 pt-5">
          <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(subject)}`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
            <FaEnvelope aria-hidden="true" /> Reply to {enquiry.email}
          </a>
          {enquiry.phoneNumber ? (
            <a href={`tel:${enquiry.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg border border-fg/15 px-4 py-2.5 text-sm font-semibold hover:border-fg/40">
              <FaPhone aria-hidden="true" /> {enquiry.phoneNumber}
            </a>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Mark as:</span>
          {(["new", "contacted", "closed"] as EnquiryStatus[])
            .filter((next) => next !== enquiry.status)
            .map((next) => (
              <Button key={next} disabled={busy} onClick={() => onStatus(enquiry, next)}>
                {statusLabel[next]}
              </Button>
            ))}
          <span className="ml-auto">
            <Button tone="danger" disabled={busy} onClick={() => onDelete(enquiry)}>
              <FaTrashCan aria-hidden="true" /> Delete
            </Button>
          </span>
        </div>
      </Card>

      {enquiry.jv ? <JvTermsCard enquiry={enquiry} jv={enquiry.jv} listing={listing} /> : null}
    </div>
  );
}

const matchesLoi = (enquiry: InboxEnquiry, filter: LoiFilter) =>
  filter === "all" || (filter === "wants" ? enquiry.jv?.generateLoi === true : enquiry.jv?.generateLoi === false);

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
