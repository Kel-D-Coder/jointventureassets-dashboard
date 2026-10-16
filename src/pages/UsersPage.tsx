import { useMemo, useState, type ReactNode } from "react";
import { FaBan, FaCheck, FaEnvelope, FaPaperPlane, FaPhone, FaRotateLeft } from "react-icons/fa6";
import { accounts, sendProfileReminder } from "@/lib/inboxApi";
import { useAction, useResource } from "@/hooks/useResource";
import { Avatar } from "@/components/Avatar";
import { DocumentList } from "@/components/DocumentList";
import { fullProfile } from "@/data/profileLabels";
import { cx, formatDateTime, timeAgo } from "@/lib/format";
import { Button, Card, CardTitle, EmptyState, Notice, PageHeader, Pill, SkeletonRows, Tabs, inputClass, type PillTone } from "@/ui";
import type { AccountStatus, MemberAccount, MemberRole, SubmittedDocument } from "@/types";

type StatusFilter = AccountStatus | "all";
type RoleFilter = Exclude<MemberRole, "Admin"> | "all";

const statusLabel: Record<AccountStatus, string> = { pending: "Awaiting approval", active: "Active", suspended: "Suspended" };
const statusTone: Record<AccountStatus, PillTone> = { pending: "warning", active: "success", suspended: "danger" };

export default function UsersPage() {
  const { data = [], loading, error, reload } = useResource(accounts.list, "Couldn't load the members.");
  const setStatus = useAction(accounts.setStatus, "Couldn't update that member.");
  const [status, setStatusFilter] = useState<StatusFilter>("pending");
  const [role, setRole] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.filter(
      (member) =>
        (status === "all" || member.status === status) &&
        (role === "all" || member.role === role) &&
        (!needle || [member.fullName, member.email, member.profile.companyName ?? ""].join(" ").toLowerCase().includes(needle)),
    );
  }, [data, status, role, query]);

  const open = visible.find((member) => member.id === openId) ?? visible[0];
  const count = (value: StatusFilter) => data.filter((m) => (value === "all" || m.status === value) && (role === "all" || m.role === role)).length;

  const change = async (member: MemberAccount, next: AccountStatus, text: string) => {
    try {
      await setStatus.run(member.id, next);
      await reload();
      setNotice({ tone: "success", text });
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Members"
        intro="Everyone who registered on the website. Open a member to see the profile they entered and their documents, then approve or suspend them."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Filter by status"
          value={status}
          onChange={(value) => {
            setStatusFilter(value);
            setOpenId(null);
          }}
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
          placeholder="Search name, email or company"
          aria-label="Search members"
          className={`${inputClass} sm:ml-auto sm:max-w-xs`}
        />
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <SkeletonRows />
      ) : error ? null : visible.length === 0 ? (
        <EmptyState title={status === "pending" ? "All caught up" : "No members"}>
          {status === "pending" ? "No one is waiting for approval." : "Nobody matches these filters."}
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <ul className="overflow-hidden rounded-2xl border border-fg/8 bg-raised lg:max-h-[calc(100svh-16rem)] lg:overflow-y-auto">
            {visible.map((member) => (
              <li key={member.id} className="border-b border-fg/8 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenId(member.id)}
                  className={cx("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors", open?.id === member.id ? "bg-gold-soft/60" : "hover:bg-surface")}
                >
                  <Avatar name={member.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-fg">{member.fullName}</span>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(member.createdAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {member.role} · {member.category}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Pill tone={statusTone[member.status]}>{statusLabel[member.status]}</Pill>
                      {!member.profileCompleted ? <Pill>Profile not finished</Pill> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {open ? <MemberDetail key={open.id} member={open} busy={setStatus.pending} onChange={change} /> : null}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children, wide, missing }: { label: string; children: ReactNode; wide?: boolean; missing?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="label text-muted">{label}</dt>
      <dd className={cx("mt-1 text-sm whitespace-pre-line", missing ? "font-medium text-warning" : "text-fg")}>{children}</dd>
    </div>
  );
}

function MemberDetail({
  member,
  busy,
  onChange,
}: {
  member: MemberAccount;
  busy: boolean;
  onChange: (member: MemberAccount, next: AccountStatus, text: string) => void;
}) {
  const answers = fullProfile(member.role, member.category, member.profile);
  const missingRequired = answers.filter((answer) => answer.required && !answer.value).length;
  const isInvestor = member.role === "Investor";
  const documentSlots: Array<{ label: string; required: boolean; doc?: SubmittedDocument }> = isInvestor
    ? [
        { label: "Company profile", required: true, doc: member.documents?.companyProfile },
        { label: "Proof of funds", required: false, doc: member.documents?.proofOfFunds },
      ]
    : [];
  const uploaded = documentSlots.filter((slot): slot is { label: string; required: boolean; doc: SubmittedDocument } => Boolean(slot.doc));
  const missingCompanyProfile = isInvestor && !member.documents?.companyProfile;
  const canRemind = member.status === "pending" && (!member.profileCompleted || missingCompanyProfile);

  const [reminding, setReminding] = useState(false);
  const [remindedAt, setRemindedAt] = useState<Date | null>(null);

  const remind = async () => {
    setReminding(true);
    try {
      await sendProfileReminder(member.id);
      setRemindedAt(new Date());
    } finally {
      setReminding(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} />
            <div>
              <h2 className="text-2xl text-fg">{member.fullName}</h2>
              <p className="text-sm text-muted">
                {member.role} · {member.category}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={statusTone[member.status]}>{statusLabel[member.status]}</Pill>
            <Pill tone={member.profileCompleted ? "success" : "warning"}>{member.profileCompleted ? "Profile complete" : "Profile not finished"}</Pill>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-fg/8 pt-5">
          {member.status !== "active" ? (
            <Button tone="solid" size="md" disabled={busy} onClick={() => onChange(member, "active", `${member.fullName} is approved and can use the platform.`)}>
              {member.status === "suspended" ? <FaRotateLeft aria-hidden="true" /> : <FaCheck aria-hidden="true" />}
              {member.status === "suspended" ? "Reactivate" : "Approve"}
            </Button>
          ) : null}
          {member.status !== "suspended" ? (
            <Button tone="danger" size="md" disabled={busy} onClick={() => onChange(member, "suspended", `${member.fullName} is suspended and can no longer log in.`)}>
              <FaBan aria-hidden="true" /> Suspend
            </Button>
          ) : null}
          {canRemind ? (
            <Button tone="gold" size="md" disabled={reminding || remindedAt !== null} onClick={remind}>
              <FaPaperPlane aria-hidden="true" /> {reminding ? "Sending…" : remindedAt ? "Reminder sent" : "Send reminder"}
            </Button>
          ) : null}
        </div>
        {canRemind ? (
          <p className="mt-3 text-xs text-muted">
            {remindedAt
              ? `Reminder requested at ${formatDateTime(remindedAt.toISOString())}. Emails go out once the backend is connected; in demo mode nothing is sent.`
              : !member.profileCompleted
                ? "This member hasn't finished their profile. Send a reminder, or wait before approving."
                : "This investor hasn't uploaded a company profile. Send a reminder, or wait before approving."}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail label={member.category !== "Individual" ? "Contact person" : "Full name"}>{member.fullName}</Detail>
          <Detail label="Email">
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-2 hover:underline">
              <FaEnvelope aria-hidden="true" className="text-muted" /> {member.email}
            </a>
          </Detail>
          <Detail label="Phone number" missing={!member.phoneNumber}>
            {member.phoneNumber ? (
              <a href={`tel:${member.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:underline">
                <FaPhone aria-hidden="true" className="text-muted" /> {member.phoneNumber}
              </a>
            ) : (
              "Not provided"
            )}
          </Detail>
          <Detail label="Role">{member.role}</Detail>
          <Detail label="Category">{member.category}</Detail>
          <Detail label="Member ID">{member.id}</Detail>
          <Detail label="Joined">{formatDateTime(member.createdAt)}</Detail>
          <Detail label="Last active">{formatDateTime(member.lastActiveAt)}</Detail>
          <Detail label="Profile last updated">{formatDateTime(member.updatedAt)}</Detail>
        </dl>
      </Card>

      <Card>
        <CardTitle
          hint={
            missingRequired
              ? `Every question from “Complete your profile”. ${missingRequired} required ${missingRequired === 1 ? "answer is" : "answers are"} missing.`
              : "Every question from “Complete your profile” on the website."
          }
        >
          Registration profile
        </CardTitle>
        {answers.length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {answers.map((answer) => (
              <Detail key={answer.key} label={answer.label} wide={answer.wide} missing={!answer.value}>
                {answer.value || (answer.required ? "Not provided (required)" : "Not provided")}
              </Detail>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">There are no profile questions for this role.</p>
        )}
      </Card>

      {isInvestor ? (
        <Card>
          <CardTitle hint="Company profile is required for investors; proof of funds is optional.">Documents</CardTitle>
          {uploaded.length ? <DocumentList documents={uploaded.map((slot) => slot.doc)} labels={uploaded.map((slot) => slot.label)} /> : null}
          {documentSlots
            .filter((slot) => !slot.doc)
            .map((slot) => (
              <p key={slot.label} className={cx("mt-3 text-sm", slot.required ? "font-medium text-warning" : "text-muted")}>
                {slot.label}: not uploaded{slot.required ? " (required)" : " (optional)"}
              </p>
            ))}
        </Card>
      ) : null}
    </div>
  );
}
