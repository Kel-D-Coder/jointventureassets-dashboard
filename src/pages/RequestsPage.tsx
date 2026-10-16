import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { requests } from "@/lib/mockApi";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { RequestStatusPill } from "@/components/StatusPills";
import { requestTypeLabel } from "@/data/labels";
import { formatDate, formatNairaShort } from "@/lib/format";
import { EmptyState, Notice, PageHeader, SkeletonRows, Table, Tabs, inputClass } from "@/ui";
import type { RequestStatus, RequestType } from "@/types";

type StatusFilter = RequestStatus | "all";
type TypeFilter = RequestType | "all";

export default function RequestsPage() {
  const { data = [], loading, error } = useResource(requests.list, "Couldn't load the requests. Try again.");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.filter(
      (request) =>
        (status === "all" || request.status === status) &&
        (type === "all" || request.requestType === type) &&
        (!needle || [request.title, request.fullName, request.location].join(" ").toLowerCase().includes(needle)),
    );
  }, [data, status, type, query]);

  const count = (value: StatusFilter) =>
    value === "all" ? data.length : data.filter((request) => request.status === value).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Requests"
        intro="Land offers, development briefs and partnership requests submitted by members. Accepted requests can be turned into listings."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "pending", label: "Pending", count: count("pending") },
            { value: "accepted", label: "Accepted", count: count("accepted") },
            { value: "rejected", label: "Rejected", count: count("rejected") },
            { value: "all", label: "All", count: count("all") },
          ]}
        />
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => setType(event.target.value as TypeFilter)}
          className={`${inputClass} w-auto!`}
        >
          <option value="all">All types</option>
          {Object.entries(requestTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, name or location"
          aria-label="Search requests"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : visible.length === 0 ? (
        <EmptyState title="Nothing here">No requests match these filters.</EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>Request</th>
              <th>Type</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Received</th>
            </>
          }
        >
          {visible.map((request) => (
            <tr key={request.id} className="hover:bg-surface/60">
              <td>
                <Link to={`/requests/${request.id}`} className="flex items-center gap-3">
                  <Avatar name={request.fullName} size="sm" />
                  <span className="min-w-0">
                    <span className="block max-w-sm truncate font-semibold text-fg hover:underline">{request.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {request.fullName} · {request.location}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="whitespace-nowrap text-muted">{requestTypeLabel[request.requestType]}</td>
              <td className="whitespace-nowrap font-semibold text-fg tabular-nums">{formatNairaShort(request.budget)}</td>
              <td>
                <RequestStatusPill status={request.status} />
              </td>
              <td className="whitespace-nowrap text-muted">{formatDate(request.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}

      {!loading ? (
        <p className="text-xs text-muted">
          Showing {visible.length} of {data.length}.
        </p>
      ) : null}
    </div>
  );
}
