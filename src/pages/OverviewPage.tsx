import { Link } from "react-router-dom";
import { FaBuilding, FaFileSignature, FaInbox, FaUsers } from "react-icons/fa6";
import { listings, messages, requests } from "@/lib/api";
import { accounts, inboxEnquiries, listingSubmissions } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { PersonLink } from "@/components/PersonLink";
import { RequestStatusPill } from "@/components/StatusPills";
import { requestStatusLabel, requestTypeLabel } from "@/data/labels";
import { formatNairaShort, timeAgo } from "@/lib/format";
import { Card, CardTitle, EmptyState, Notice, PageHeader, SkeletonRows, StatCard } from "@/ui";
import type { RequestStatus } from "@/types";
import { coverOf } from "@/lib/videoWatermark";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const loadOverview = async () => {
  const [allRequests, allListings, allUsers, allMessages, allEnquiries, allSubmissions] = await Promise.all([
    requests.list(),
    listings.list(),
    accounts.list().catch(() => []),
    messages.list(),
    // The website's inbox may not be running; the overview still loads without it.
    inboxEnquiries.list().catch(() => []),
    listingSubmissions.list().catch(() => []),
  ]);
  return { allRequests, allListings, allUsers, allMessages, allEnquiries, allSubmissions };
};

const statusOrder: RequestStatus[] = ["pending", "accepted", "rejected"];
const statusFill: Record<RequestStatus, string> = {
  pending: "bg-warning",
  accepted: "bg-success",
  rejected: "bg-danger",
};

export default function OverviewPage() {
  const { data, loading, error } = useResource(loadOverview, "Couldn't load the overview. Try again.");

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Dashboard" title="Overview" />
        <SkeletonRows rows={6} />
      </div>
    );
  }
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  const { allRequests, allListings, allUsers, allMessages, allEnquiries, allSubmissions } = data;
  const enquiryCount = (listingId: string) => allEnquiries.filter((e) => e.target.type === "listing" && e.target.id === listingId).length;
  const pendingSubmissions = allSubmissions.filter((s) => s.status === "pending").length;
  const newEnquiries = allEnquiries.filter((enquiry) => enquiry.status === "new").length;
  const pending = allRequests.filter((request) => request.status === "pending");
  const live = allListings.filter((listing) => listing.status === "published");
  const liveJv = live.filter((listing) => listing.dealType === "jv").length;
  const newUsers = allUsers.filter((user) => Date.now() - new Date(user.createdAt).getTime() < WEEK_MS).length;
  const unread = allMessages.filter((message) => !message.read).length;
  const counts = statusOrder.map((status) => ({
    status,
    count: allRequests.filter((request) => request.status === status).length,
  }));
  const topListings = [...live].sort((a, b) => enquiryCount(b.id) - enquiryCount(a.id)).slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        intro="What needs your attention across requests, listings, members and the inbox."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FaFileSignature} label="Awaiting review" value={pending.length} note={`${allRequests.length} requests in total`} />
        <StatCard icon={FaBuilding} label="Live listings" value={live.length} note={`${liveJv} JV · ${live.length - liveJv} for sale · ${pendingSubmissions} to review`} />
        <StatCard icon={FaUsers} label="Members" value={allUsers.length} note={`${newUsers} joined this week · ${allUsers.filter((u) => u.status === "pending").length} to approve`} />
        <StatCard icon={FaInbox} label="New enquiries" value={newEnquiries} note={`${unread} unread contact ${unread === 1 ? "message" : "messages"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardTitle
            hint="Newest first. Open one to accept or reject it."
            action={
              <Link to="/requests" className="text-sm font-semibold text-gold-deep underline-offset-4 hover:underline">
                All requests
              </Link>
            }
          >
            Request queue
          </CardTitle>
          {pending.length === 0 ? (
            <EmptyState title="All caught up">No requests are waiting for review.</EmptyState>
          ) : (
            <ul className="divide-y divide-fg/8">
              {pending.slice(0, 5).map((request) => (
                <li key={request.id} className="flex items-center gap-3 py-3">
                  <Avatar name={request.fullName} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/requests/${request.id}`} className="block truncate text-sm font-semibold text-fg hover:underline">
                      {request.title}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      <PersonLink name={request.fullName} email={request.email} userId={request.userId} /> · {requestTypeLabel[request.requestType]} ·{" "}
                      {formatNairaShort(request.budget)}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted">{timeAgo(request.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle hint={`${allRequests.length} requests received`}>Request outcomes</CardTitle>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={counts.map((c) => `${requestStatusLabel[c.status]}: ${c.count}`).join(", ")}>
            {counts
              .filter((c) => c.count > 0)
              .map((c) => (
                <div
                  key={c.status}
                  title={`${requestStatusLabel[c.status]}: ${c.count}`}
                  className={statusFill[c.status]}
                  style={{ flexGrow: c.count }}
                />
              ))}
          </div>
          <ul className="mt-5 space-y-3">
            {counts.map((c) => (
              <li key={c.status} className="flex items-center justify-between gap-3">
                <RequestStatusPill status={c.status} />
                <span className="text-sm font-semibold text-fg tabular-nums">
                  {c.count}
                  <span className="ml-1 font-normal text-muted">
                    ({allRequests.length ? Math.round((c.count / allRequests.length) * 100) : 0}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle
            hint="Live listings drawing the most enquiries."
            action={
              <Link to="/enquiries" className="text-sm font-semibold text-gold-deep underline-offset-4 hover:underline">
                All enquiries
              </Link>
            }
          >
            Top listings
          </CardTitle>
          <ul className="space-y-3">
            {topListings.map((listing) => (
              <li key={listing.id}>
                <Link to={`/enquiries?listing=${listing.id}`} className="flex items-center gap-4 rounded-xl p-2 -m-2 hover:bg-surface">
                  <img src={coverOf(listing.images)} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{listing.title}</p>
                    <p className="truncate text-xs text-muted">
                      {listing.area}, {listing.city} · {listing.dealType === "jv" ? "Joint venture" : "For sale"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-fg tabular-nums">{enquiryCount(listing.id)}</p>
                    <p className="text-xs text-muted">enquiries</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle
            action={
              <Link to="/users" className="text-sm font-semibold text-gold-deep underline-offset-4 hover:underline">
                All members
              </Link>
            }
          >
            Newest members
          </CardTitle>
          <ul className="divide-y divide-fg/8">
            {allUsers.slice(0, 5).map((user) => (
              <li key={user.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/users/${user.id}`} className="block truncate text-sm font-semibold text-fg hover:underline">
                    {user.fullName}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {user.role} · {user.category}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted">{timeAgo(user.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
