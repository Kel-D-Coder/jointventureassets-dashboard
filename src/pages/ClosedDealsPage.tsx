import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCalendarCheck, FaClock, FaHandshake, FaMoneyBillWave } from "react-icons/fa6";
import { listings } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { PersonLink } from "@/components/PersonLink";
import { DealTypePill } from "@/components/StatusPills";
import { cx, formatDate, formatNairaShort } from "@/lib/format";
import { EmptyState, Notice, PageHeader, RowLink, SkeletonRows, StatCard, Table, Tabs, inputClass } from "@/ui";
import type { DealClosing, DealType, Listing } from "@/types";

type ClosedListing = Listing & { closing: DealClosing };
type TypeFilter = DealType | "all";

const DAY = 24 * 60 * 60 * 1000;
const timeFormat = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" });
const formatTime = (iso: string) => timeFormat.format(new Date(iso));
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const daysToClose = (deal: ClosedListing) => Math.max(0, Math.round((Date.parse(deal.closing.closedAt) - Date.parse(deal.createdAt)) / DAY));

/** Closed listings that have their closing recorded, newest first. Older closed listings without a record are counted separately. */
async function loadDeals() {
  const all = await listings.list();
  const closed = all.filter((listing) => listing.status === "closed");
  const deals = closed
    .filter((listing): listing is ClosedListing => Boolean(listing.closing))
    .sort((a, b) => b.closing.closedAt.localeCompare(a.closing.closedAt));
  return {
    deals,
    unrecorded: closed.filter((listing) => !listing.closing),
    open: all.filter((listing) => listing.status === "published" || listing.status === "under_offer"),
  };
}

export default function ClosedDealsPage() {
  const { data, loading, error } = useResource(loadDeals, "Couldn't load the closed deals.");
  const navigate = useNavigate();
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const deals = useMemo(() => data?.deals ?? [], [data]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return deals.filter(
      (deal) =>
        (type === "all" || deal.dealType === type) &&
        (!needle ||
          [deal.title, deal.area, deal.city, deal.ownerName, deal.closing.counterparty.name].join(" ").toLowerCase().includes(needle)),
    );
  }, [deals, type, query]);

  const totalValue = deals.reduce((sum, deal) => sum + deal.closing.finalAmount, 0);
  const totalFees = deals.reduce((sum, deal) => sum + deal.closing.facilitationFee, 0);
  const averageDays = deals.length ? Math.round(deals.reduce((sum, deal) => sum + daysToClose(deal), 0) / deals.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Closed deals"
        intro="Every deal JVA has closed: who it closed with, when, for how much, and the documents used."
        action={
          data?.open.length ? (
            <select
              aria-label="Record a closed deal"
              value=""
              onChange={(event) => event.target.value && navigate(`/listings/${event.target.value}?close=1`)}
              className={cx(inputClass, "w-auto! font-semibold")}
            >
              <option value="">Record a closed deal…</option>
              {data.open.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Deals closed" value={deals.length} icon={FaHandshake} note={plural(deals.filter((d) => d.dealType === "jv").length, "joint venture") + " · " + plural(deals.filter((d) => d.dealType === "sale").length, "sale")} />
        <StatCard label="Total deal value" value={formatNairaShort(totalValue)} icon={FaMoneyBillWave} />
        <StatCard label="Facilitation fees" value={formatNairaShort(totalFees)} icon={FaCalendarCheck} note="Earned by JVA" />
        <StatCard label="Average time to close" value={`${averageDays} days`} icon={FaClock} note="From listing to closing" />
      </div>

      {data?.unrecorded.length ? (
        <p className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
          {data.unrecorded.length} closed {data.unrecorded.length === 1 ? "listing has" : "listings have"} no closing details yet:{" "}
          {data.unrecorded.map((listing, index) => (
            <span key={listing.id}>
              {index ? ", " : ""}
              <Link to={`/listings/${listing.id}?close=1`} className="font-semibold underline">
                {listing.title}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Deal type"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All", count: deals.length },
            { value: "jv", label: "Joint venture", count: deals.filter((d) => d.dealType === "jv").length },
            { value: "sale", label: "Sale", count: deals.filter((d) => d.dealType === "sale").length },
          ]}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search property, owner or buyer"
          aria-label="Search closed deals"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {loading ? (
        <SkeletonRows />
      ) : visible.length === 0 ? (
        <EmptyState title="No closed deals">
          {deals.length ? "Nothing matches these filters." : "When a listing is marked Closed, record who it closed with and it appears here."}
        </EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>Property</th>
              <th>Closed with</th>
              <th>Amount</th>
              <th>Fee</th>
              <th>Closed</th>
              <th>Time to close</th>
            </>
          }
        >
          {visible.map((deal) => (
            <RowLink key={deal.id} to={`/closed-deals/${deal.id}`}>
              <td>
                <Link to={`/closed-deals/${deal.id}`} className="flex items-center gap-3">
                  {deal.images[0] ? (
                    <img src={deal.images[0]} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="grid h-10 w-12 shrink-0 place-items-center rounded-md bg-surface text-ash">
                      <FaHandshake aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block max-w-xs truncate font-semibold text-fg hover:underline">{deal.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <DealTypePill dealType={deal.dealType} /> {deal.area}, {deal.city}
                    </span>
                  </span>
                </Link>
              </td>
              <td>
                <PersonLink name={deal.closing.counterparty.name} email={deal.closing.counterparty.email} className="font-medium text-fg" />
                <span className="block text-xs text-muted">
                  from <PersonLink name={deal.ownerName} email={deal.ownerEmail} />
                </span>
              </td>
              <td className="whitespace-nowrap font-semibold text-fg tabular-nums">{formatNairaShort(deal.closing.finalAmount)}</td>
              <td className="whitespace-nowrap text-muted tabular-nums">{deal.closing.facilitationFee ? formatNairaShort(deal.closing.facilitationFee) : "None"}</td>
              <td className="whitespace-nowrap text-muted">
                {formatDate(deal.closing.closedAt)}
                <span className="block text-xs">{formatTime(deal.closing.closedAt)}</span>
              </td>
              <td className="whitespace-nowrap text-muted">{plural(daysToClose(deal), "day")}</td>
            </RowLink>
          ))}
        </Table>
      )}
    </div>
  );
}
