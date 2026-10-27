import { useCallback } from "react";
import { FaEye, FaUserSecret } from "react-icons/fa6";
import { listingViewers } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { PersonLink } from "@/components/PersonLink";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Card, CardTitle, Notice, SkeletonRows } from "@/ui";

/** Who has viewed a listing on the website: signed-in members by name, plus visitors who weren't signed in. */
export function ListingViewersCard({ listingId }: { listingId: string }) {
  const load = useCallback(() => listingViewers(listingId), [listingId]);
  const { data, loading, error } = useResource(load, "Couldn't load who viewed this listing.");

  return (
    <div id="viewers">
      <Card>
        <CardTitle hint="Visits to this listing on the website. Visits from the JVA team aren't counted.">Viewers</CardTitle>
        {loading ? (
          <SkeletonRows rows={2} />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : data ? (
          <>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 text-fg">
                <FaEye aria-hidden="true" className="text-gold-deep" /> <strong>{data.total}</strong> {data.total === 1 ? "view" : "views"}
              </span>
              <span className="text-muted">
                {data.members.length} {data.members.length === 1 ? "member" : "members"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted">
                <FaUserSecret aria-hidden="true" /> {data.anonymous} from visitors who weren&apos;t signed in
              </span>
            </div>
            {data.members.length ? (
              <ul className="divide-y divide-fg/8 rounded-lg border border-fg/10">
                {data.members.map((viewer) => (
                  <li key={viewer.userId || viewer.email} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <Avatar name={viewer.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <PersonLink name={viewer.name} email={viewer.email} userId={viewer.userId || undefined} className="font-semibold text-fg" />
                      <p className="truncate text-xs text-muted">
                        {[viewer.role, viewer.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p className="font-semibold text-fg">
                        {viewer.count} {viewer.count === 1 ? "time" : "times"}
                      </p>
                      {viewer.lastViewedAt ? <p title={formatDateTime(viewer.lastViewedAt)}>last {timeAgo(viewer.lastViewedAt)}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No signed-in members have viewed it yet.</p>
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
}
