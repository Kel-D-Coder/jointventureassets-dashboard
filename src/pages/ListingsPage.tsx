import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaLocationDot, FaMessage, FaPlus, FaStar } from "react-icons/fa6";
import { listings } from "@/lib/mockApi";
import { inboxEnquiries } from "@/lib/inboxApi";
import { useResource } from "@/hooks/useResource";
import { DealTypePill, ListingStatusPill } from "@/components/StatusPills";
import { listingStatusLabel, propertyTypeLabel } from "@/data/labels";
import { formatNairaShort, formatSize } from "@/lib/format";
import { EmptyState, Notice, PageHeader, SkeletonRows, Tabs, inputClass } from "@/ui";
import type { DealType, Listing, ListingStatus } from "@/types";

type DealFilter = DealType | "all";
type StatusFilter = ListingStatus | "all";

export default function ListingsPage() {
  const { data: all = [], loading, error } = useResource(listings.list, "Couldn't load the listings. Try again.");
  // Drafts have their own page until they're published.
  const data = useMemo(() => all.filter((listing) => listing.status !== "draft"), [all]);
  const draftCount = all.length - data.length;
  // Enquiry counts come from the website's inbox; listings still show if it isn't running.
  const { data: enquiries = [] } = useResource(loadEnquiries, "");
  const enquiryCount = (id: string) => enquiries.filter((e) => e.target.type === "listing" && e.target.id === id).length;
  const [deal, setDeal] = useState<DealFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.filter(
      (listing) =>
        (deal === "all" || listing.dealType === deal) &&
        (status === "all" || listing.status === status) &&
        (!needle || [listing.title, listing.area, listing.city, listing.state, listing.ownerName].join(" ").toLowerCase().includes(needle)),
    );
  }, [data, deal, status, query]);

  const count = (value: DealFilter) => (value === "all" ? data.length : data.filter((listing) => listing.dealType === value).length);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Listings"
        intro={
          <>
            Everything on the website&apos;s listings page: joint-venture opportunities and properties for sale.
            {draftCount ? (
              <>
                {" "}
                <Link to="/drafts" className="font-semibold text-gold-deep underline underline-offset-4">
                  {draftCount} unfinished {draftCount === 1 ? "draft" : "drafts"}
                </Link>
              </>
            ) : null}
          </>
        }
        action={
          <Link to="/listings/new" className="inline-flex items-center gap-2 rounded-lg bg-ink px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85">
            <FaPlus aria-hidden="true" /> New listing
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Filter by deal type"
          value={deal}
          onChange={setDeal}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "jv", label: "Joint venture", count: count("jv") },
            { value: "sale", label: "For sale", count: count("sale") },
          ]}
        />
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={`${inputClass} w-auto!`}>
          <option value="all">Any status</option>
          {Object.entries(listingStatusLabel).filter(([value]) => value !== "draft").map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, location or owner"
          aria-label="Search listings"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : visible.length === 0 ? (
        <EmptyState title="No listings">Nothing matches these filters.</EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} enquiries={enquiryCount(listing.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const loadEnquiries = () => inboxEnquiries.list().catch(() => []);

function ListingCard({ listing, enquiries }: { listing: Listing; enquiries: number }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group block h-full overflow-hidden rounded-xl border border-fg/[0.08] bg-raised transition-shadow hover:shadow-[0_10px_30px_-12px_rgb(14_17_22/0.25)]"
    >
      <div className="relative">
        <img src={listing.images[0]} alt="" className="aspect-16/10 w-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <DealTypePill dealType={listing.dealType} />
          <span className="rounded-full bg-raised"><ListingStatusPill status={listing.status} /></span>
        </div>
        {listing.featured ? (
          <span className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-ink text-gold" title="Featured on the homepage">
            <FaStar aria-hidden="true" />
            <span className="sr-only">Featured</span>
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <p className="font-display text-xl leading-snug text-fg group-hover:underline">{listing.title}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <FaLocationDot aria-hidden="true" /> {listing.area}, {listing.city}
        </p>
        <p className="mt-1 truncate text-xs text-muted">
          {listing.ownerName}
          {listing.ownerPhone ? ` · ${listing.ownerPhone}` : ""}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-fg/8 pt-4">
          <div>
            <p className="label text-muted">{listing.dealType === "jv" ? "Land value" : "Price"}</p>
            <p className="mt-1 text-lg font-bold text-fg">{formatNairaShort(listing.price)}</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>
              {propertyTypeLabel[listing.propertyType]} · {formatSize(listing.sizeSqm)}
            </p>
            <p className="mt-1 inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><FaEye aria-hidden="true" /> {listing.views}</span>
              <span className="inline-flex items-center gap-1" title="Enquiries"><FaMessage aria-hidden="true" /> {enquiries}</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
