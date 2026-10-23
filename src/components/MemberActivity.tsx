import { useCallback } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa6";
import { listings, requests } from "@/lib/api";
import { inboxEnquiries, listingSubmissions } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { formatDate, formatNairaShort } from "@/lib/format";
import { Card, CardTitle, Pill } from "@/ui";
import type { MemberAccount } from "@/types";

interface ActivityRow {
  key: string;
  kind: string;
  title: string;
  detail: string;
  date: string;
  to: string;
}

/** Everything a member has done on the platform, matched by their account id or email. */
async function loadActivity(member: MemberAccount): Promise<ActivityRow[]> {
  const email = member.email.toLowerCase();
  const same = (other?: string) => Boolean(other) && other!.trim().toLowerCase() === email;
  const [allRequests, submissions, enquiries, allListings] = await Promise.all([
    requests.list(),
    listingSubmissions.list().catch(() => []),
    inboxEnquiries.list().catch(() => []),
    listings.list(),
  ]);
  const rows: ActivityRow[] = [
    ...allRequests
      .filter((request) => request.userId === member.id || same(request.email))
      .map((request) => ({ key: request.id, kind: "Request", title: request.title, detail: `Status: ${request.status}`, date: request.createdAt, to: `/requests/${request.id}` })),
    ...submissions
      .filter((submission) => same(submission.contact.email))
      .map((submission) => ({
        key: submission.id,
        kind: "Listing request",
        title: submission.listing.title,
        detail: `Status: ${submission.status}`,
        date: submission.createdAt,
        to: `/listing-requests/${submission.id}`,
      })),
    ...enquiries
      .filter((enquiry) => same(enquiry.email))
      .map((enquiry) => ({
        key: enquiry.id,
        kind: "Enquiry",
        title: enquiry.target.title,
        detail: enquiry.jv ? (enquiry.jv.generateLoi ? "Wants us to prepare their LOI" : "Providing their own LOI") : `Status: ${enquiry.status}`,
        date: enquiry.createdAt,
        to: `/enquiries/${enquiry.id}`,
      })),
    ...allListings
      .filter((listing) => same(listing.ownerEmail) || same(listing.closing?.counterparty.email))
      .map((listing) => ({
        key: listing.id,
        kind: listing.closing ? "Closed deal" : "Listing",
        title: listing.title,
        detail: listing.closing ? `${same(listing.ownerEmail) ? "As owner" : "As buyer / developer"} · ${formatNairaShort(listing.closing.finalAmount)}` : "Listed as owner",
        date: listing.closing?.closedAt ?? listing.createdAt,
        to: listing.closing ? `/closed-deals/${listing.id}` : `/listings/${listing.id}`,
      })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function MemberActivity({ member }: { member: MemberAccount }) {
  const load = useCallback(() => loadActivity(member), [member]);
  const { data, loading } = useResource(load, "Couldn't load this member's activity.");

  return (
    <Card>
      <CardTitle hint="Requests, listing requests, enquiries and deals linked to this member's account or email.">Activity on the platform</CardTitle>
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-fg/8">
          {data.map((row) => (
            <li key={row.key + row.kind}>
              <Link to={row.to} className="group flex items-center gap-3 py-3">
                <Pill>{row.kind}</Pill>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg group-hover:underline">{row.title}</span>
                  <span className="block truncate text-xs text-muted">{row.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDate(row.date)}</span>
                <FaArrowRight aria-hidden="true" className="shrink-0 text-ash group-hover:text-fg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
