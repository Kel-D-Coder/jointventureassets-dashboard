import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { accounts } from "@/lib/inboxApi";
import { useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { accountStatusLabel, accountStatusTone } from "@/data/labels";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { EmptyState, Notice, PageHeader, Pill, RowLink, SkeletonRows, Table, Tabs, inputClass } from "@/ui";
import type { AccountStatus, MemberRole } from "@/types";

type StatusFilter = AccountStatus | "all";
type RoleFilter = Exclude<MemberRole, "Admin"> | "all";

export default function UsersPage() {
  const { data = [], loading, error } = useResource(accounts.list, "Couldn't load the members.");
  const [status, setStatusFilter] = useState<StatusFilter>("pending");
  const [role, setRole] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.filter(
      (member) =>
        (status === "all" || member.status === status) &&
        (role === "all" || member.role === role) &&
        (!needle || [member.fullName, member.email, member.phoneNumber, member.profile.companyName ?? ""].join(" ").toLowerCase().includes(needle)),
    );
  }, [data, status, role, query]);

  const count = (value: StatusFilter) => data.filter((m) => (value === "all" || m.status === value) && (role === "all" || m.role === role)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Members"
        intro="Everyone who registered on the website. Open a member to see their profile, documents and activity, then approve or suspend them."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Filter by status"
          value={status}
          onChange={setStatusFilter}
          options={[
            { value: "pending", label: "Awaiting approval", count: count("pending") },
            { value: "active", label: "Active", count: count("active") },
            { value: "suspended", label: "Suspended", count: count("suspended") },
            { value: "all", label: "All", count: count("all") },
          ]}
        />
        <select aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value as RoleFilter)} className={`${inputClass} w-auto!`}>
          <option value="all">All roles</option>
          <option value="Landowner">Landowners</option>
          <option value="Investor">Investors</option>
          <option value="Buyer">Buyers</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, phone or company"
          aria-label="Search members"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : error ? null : visible.length === 0 ? (
        <EmptyState title={status === "pending" ? "All caught up" : "No members"}>
          {status === "pending" ? "No one is waiting for approval." : "Nobody matches these filters."}
        </EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>Member</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Profile</th>
              <th>Joined</th>
            </>
          }
        >
          {visible.map((member) => (
            <RowLink key={member.id} to={`/users/${member.id}`}>
              <td>
                <Link to={`/users/${member.id}`} className="flex items-center gap-3">
                  <Avatar name={member.fullName} size="sm" />
                  <span className="min-w-0">
                    <span className="block max-w-xs truncate font-semibold text-fg hover:underline">{member.fullName}</span>
                    <span className="block max-w-xs truncate text-xs text-muted">{member.email}</span>
                  </span>
                </Link>
              </td>
              <td className="whitespace-nowrap">
                <span className="text-fg">{member.role}</span>
                <span className="block text-xs text-muted">{member.category}</span>
              </td>
              <td className="whitespace-nowrap text-muted">{member.phoneNumber || <span className="text-warning">Not given</span>}</td>
              <td>
                <Pill tone={accountStatusTone[member.status]}>{accountStatusLabel[member.status]}</Pill>
              </td>
              <td>
                <Pill tone={member.profileCompleted ? "success" : "warning"}>{member.profileCompleted ? "Complete" : "Not finished"}</Pill>
              </td>
              <td className="whitespace-nowrap text-muted" title={formatDateTime(member.createdAt)}>
                {formatDate(member.createdAt)}
                <span className="block text-xs">{timeAgo(member.createdAt)}</span>
              </td>
            </RowLink>
          ))}
        </Table>
      )}
    </div>
  );
}
