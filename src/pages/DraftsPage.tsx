import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaImage, FaPen, FaPlus, FaTrashCan } from "react-icons/fa6";
import { listings } from "@/lib/mockApi";
import { useAction, useResource } from "@/hooks/useResource";
import { DealTypePill } from "@/components/StatusPills";
import { completeness, missingFor } from "@/lib/listingChecks";
import { formatNairaShort, timeAgo } from "@/lib/format";
import { Button, EmptyState, Notice, PageHeader, SkeletonRows } from "@/ui";
import type { Listing } from "@/types";

export default function DraftsPage() {
  const { data = [], loading, error, reload } = useResource(listings.list, "Couldn't load the drafts. Try again.");
  const remove = useAction(listings.remove, "Couldn't delete that draft.");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const drafts = useMemo(() => data.filter((listing) => listing.status === "draft"), [data]);

  const destroy = async (draft: Listing) => {
    try {
      await remove.run(draft.id);
      setNotice({ tone: "success", text: `Deleted "${draft.title || "Untitled draft"}".` });
      await reload();
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Listings"
        title={loading ? "Drafts" : `Drafts (${drafts.length})`}
        intro={`${drafts.length} ${drafts.length === 1 ? "listing" : "listings"} saved before everything required was filled in. They aren't on the website until you publish them.`}
        action={
          <Link to="/listings/new" className="inline-flex items-center gap-2 rounded-lg bg-ink px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
            <FaPlus aria-hidden="true" /> New listing
          </Link>
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : drafts.length === 0 ? (
        <EmptyState title="No drafts">
          When you create a listing without all the details, choose <strong>Save as draft</strong> and it will wait here.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => {
            const missing = missingFor(draft);
            const percent = completeness(draft);
            return (
              <li key={draft.id} className="flex flex-col gap-4 rounded-xl border border-fg/[0.08] bg-raised p-4 sm:flex-row sm:items-center">
                {draft.images[0] ? (
                  <img src={draft.images[0]} alt="" className="h-24 w-full shrink-0 rounded-xl object-cover sm:w-36" />
                ) : (
                  <div className="grid h-24 w-full shrink-0 place-items-center rounded-xl bg-surface text-ash sm:w-36">
                    <FaImage aria-hidden="true" className="h-6 w-6" />
                    <span className="sr-only">No photo yet</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DealTypePill dealType={draft.dealType} />
                    <span className="text-xs text-muted">Started {timeAgo(draft.createdAt)}</span>
                  </div>
                  <Link to={`/listings/${draft.id}`} className="mt-1.5 block truncate font-display text-lg text-fg hover:underline">
                    {draft.title || "Untitled draft"}
                  </Link>
                  <p className="truncate text-sm text-muted">
                    {[draft.area, draft.city].filter(Boolean).join(", ") || "No location yet"}
                    {draft.price ? ` · ${formatNairaShort(draft.price)}` : ""}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-fg/8" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Completeness">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-fg">{percent}% complete</span>
                  </div>
                  {missing.length ? (
                    <p className="mt-1.5 text-xs text-muted">
                      Missing: <span className="font-semibold text-warning">{missing.map((check) => check.label).join(", ")}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs font-semibold text-success">Ready to publish</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {pendingDelete === draft.id ? (
                    <>
                      <Button tone="danger" disabled={remove.pending} onClick={() => destroy(draft)}>
                        {remove.pending ? "Deleting…" : "Confirm delete"}
                      </Button>
                      <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Link to={`/listings/${draft.id}`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-white hover:bg-ink/85">
                        <FaPen aria-hidden="true" /> {missing.length ? "Continue" : "Review & publish"}
                      </Link>
                      <Button tone="danger" onClick={() => setPendingDelete(draft.id)}>
                        <FaTrashCan aria-hidden="true" />
                        <span className="sr-only">Delete draft</span>
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
