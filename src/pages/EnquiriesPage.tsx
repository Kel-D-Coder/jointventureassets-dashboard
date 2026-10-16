import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaBuilding, FaFileSignature } from "react-icons/fa6";
import { inboxEnquiries } from "@/lib/inboxApi";
import { listings } from "@/lib/mockApi";
import { useResource } from "@/hooks/useResource";
import { PersonLink } from "@/components/PersonLink";
import { enquiryStatusLabel, enquiryStatusTone } from "@/data/labels";
import { formatDateTime, timeAgo } from "@/lib/format";
import { EmptyState, Notice, PageHeader, Pill, RowLink, SkeletonRows, Table, Tabs, inputClass } from "@/ui";
import type { EnquiryStatus, InboxEnquiry, Listing } from "@/types";

type StatusFilter = EnquiryStatus | "all";
type LoiFilter = "all" | "wants" | "own";
type AboutFilter = InboxEnquiry["target"]["type"] | "all";

const loadListings = async () => new Map((await listings.list()).map((listing) => [listing.id, listing]));

const matchesLoi = (enquiry: InboxEnquiry, filter: LoiFilter) =>
  filter === "all" || (filter === "wants" ? enquiry.jv?.generateLoi === true : enquiry.jv?.generateLoi === false);

export default function EnquiriesPage() {
  const inbox = useResource(inboxEnquiries.list, "Couldn't load the enquiries.");
  const local = useResource(loadListings, "Couldn't load the listings.");
  const [params, setParams] = useSearchParams();
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [loi, setLoi] = useState<LoiFilter>("all");
  const [query, setQuery] = useState("");

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

  const count = (value: StatusFilter) => all.filter((e) => matchesScope(e) && (value === "all" || e.status === value)).length;
  const aboutCount = (value: AboutFilter) => all.filter((e) => value === "all" || e.target.type === value).length;
  const loiCount = (value: LoiFilter) => all.filter((e) => matchesScope(e) && (status === "all" || e.status === status) && matchesLoi(e, value)).length;
  const hasJv = all.some((enquiry) => enquiry.jv);

  const chooseAbout = (value: AboutFilter) => {
    setParams(value === "all" ? {} : { about: value });
  };

  const chooseSubject = (key: string) => {
    if (!key) return setParams(about === "all" ? {} : { about });
    const [type, id] = key.split(":");
    setParams({ [type!]: id! });
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

      {inbox.error ? <Notice tone="error">{inbox.error}</Notice> : null}

      {inbox.loading ? (
        <SkeletonRows />
      ) : inbox.error ? null : visible.length === 0 ? (
        <EmptyState title="No enquiries">Nothing matches these filters.</EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>From</th>
              <th>About</th>
              <th>Status</th>
              <th>Received</th>
            </>
          }
        >
          {visible.map((enquiry) => (
            <RowLink key={enquiry.id} to={`/enquiries/${enquiry.id}`}>
              <td>
                <PersonLink name={enquiry.fullName} email={enquiry.email} className={enquiry.status === "new" ? "font-bold text-fg" : "font-semibold text-fg"} />
                <span className="block max-w-56 truncate text-xs text-muted">{enquiry.email}</span>
              </td>
              <td>
                <Link to={`/enquiries/${enquiry.id}`} className="flex items-center gap-3">
                  <SubjectThumb enquiry={enquiry} listing={local.data?.get(enquiry.target.id)} />
                  <span className="min-w-0">
                    <span className="block max-w-sm truncate font-medium text-fg hover:underline">{enquiry.target.title}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Pill>{enquiry.target.type === "listing" ? "Listing" : "Request"}</Pill>
                      {enquiry.jv ? <Pill tone={enquiry.jv.generateLoi ? "gold" : "neutral"}>{enquiry.jv.generateLoi ? "Wants LOI" : "Own LOI"}</Pill> : null}
                    </span>
                  </span>
                </Link>
              </td>
              <td>
                <Pill tone={enquiryStatusTone[enquiry.status]}>{enquiryStatusLabel[enquiry.status]}</Pill>
              </td>
              <td className="whitespace-nowrap text-muted" title={formatDateTime(enquiry.createdAt)}>
                {timeAgo(enquiry.createdAt)}
              </td>
            </RowLink>
          ))}
        </Table>
      )}
    </div>
  );
}

function SubjectThumb({ enquiry, listing }: { enquiry: InboxEnquiry; listing?: Listing }) {
  const image = listing?.images[0] ?? enquiry.target.image;
  if (image) return <img src={image} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" />;
  return (
    <span className="grid h-10 w-12 shrink-0 place-items-center rounded-md bg-surface text-ash">
      {enquiry.target.type === "request" ? <FaFileSignature aria-hidden="true" /> : <FaBuilding aria-hidden="true" />}
    </span>
  );
}
