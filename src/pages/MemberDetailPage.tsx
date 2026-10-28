import { useCallback, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { FaBan, FaCheck, FaEnvelope, FaPaperPlane, FaPhone, FaRotateLeft } from "react-icons/fa6";
import { accounts, sendProfileReminder } from "@/lib/api";
import { useAction, useResource } from "@/hooks/useResource";
import { forgetMembers } from "@/hooks/useMembers";
import { Avatar } from "@/components/Avatar";
import { DocumentList } from "@/components/DocumentList";
import { MemberActivity } from "@/components/MemberActivity";
import { fullProfile } from "@/data/profileLabels";
import { accountStatusLabel as statusLabel, accountStatusTone as statusTone } from "@/data/labels";
import { cx, formatDateTime } from "@/lib/format";
import { BackLink, Button, Card, CardTitle, Field, Notice, Pill, SkeletonRows, inputClass } from "@/ui";
import type { AccountStatus, MemberAccount, SubmittedDocument } from "@/types";

export default function MemberDetailPage() {
  const { userId = "" } = useParams();
  const load = useCallback(() => accounts.get(userId), [userId]);
  const { data: member, loading, error, reload } = useResource(load, "Couldn't load this member.");
  const setStatus = useAction(accounts.setStatus, "Couldn't update this member.");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  /** Returns whether the change was saved; failures show the server's message instead. */
  const change = async (target: MemberAccount, next: AccountStatus, text: string, note?: string): Promise<boolean> => {
    try {
      await setStatus.run(target.id, next, note);
      forgetMembers();
      await reload();
      setNotice({ tone: "success", text });
      return true;
    } catch (caught) {
      setNotice({ tone: "error", text: (caught as Error).message });
      return false;
    }
  };

  const back = <BackLink to="/users">All members</BackLink>;
  if (loading) return <div className="space-y-6">{back}<SkeletonRows rows={6} /></div>;
  if (error || !member) return <div className="space-y-6">{back}<Notice tone="error">{error || "That member doesn't exist."}</Notice></div>;

  return (
    <div className="space-y-6">
      {back}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <MemberDetail key={member.id} member={member} busy={setStatus.pending} onChange={change} />
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
  onChange: (member: MemberAccount, next: AccountStatus, text: string, note?: string) => Promise<boolean>;
}) {
  const answers = fullProfile(member.role, member.category, member.profile);
  const missingRequired = answers.filter((answer) => answer.required && !answer.value).length;
  const isInvestor = member.role === "Investor";
  const isBuyer = member.role === "Buyer";
  const documentSlots: Array<{ label: string; required: boolean; doc?: SubmittedDocument }> = isInvestor
    ? [
        { label: "Company profile", required: true, doc: member.documents?.companyProfile },
        { label: "Proof of funds", required: false, doc: member.documents?.proofOfFunds },
      ]
    : isBuyer
      ? [{ label: "Proof of funds", required: false, doc: member.documents?.proofOfFunds }]
      : [];
  const uploaded = documentSlots.filter((slot): slot is { label: string; required: boolean; doc: SubmittedDocument } => Boolean(slot.doc));
  const missingCompanyProfile = isInvestor && !member.documents?.companyProfile;
  const canRemind = member.status === "pending" && (!member.profileCompleted || missingCompanyProfile);

  // Suspending asks for an optional reason first; it goes in the email the member gets.
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const firstName = member.fullName.split(" ")[0] || member.fullName;

  const suspend = async () => {
    const saved = await onChange(
      member,
      "suspended",
      `${member.fullName} is suspended and has been signed out. We've emailed them${reason.trim() ? " the reason" : ""}.`,
      reason,
    );
    // Kept open if it failed, so the reason isn't lost.
    if (!saved) return;
    setSuspending(false);
    setReason("");
  };

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
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} />
            <div>
              <h1 className="text-2xl text-fg">{member.fullName}</h1>
              <p className="text-sm text-muted">
                {member.role} · {member.category}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
                  <FaEnvelope aria-hidden="true" /> {member.email}
                </a>
                {member.phoneNumber ? (
                  <a href={`tel:${member.phoneNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
                    <FaPhone aria-hidden="true" /> {member.phoneNumber}
                  </a>
                ) : (
                  <span className="text-warning">No phone number yet</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={statusTone[member.status]}>{statusLabel[member.status]}</Pill>
            <Pill tone={member.profileCompleted ? "success" : "warning"}>{member.profileCompleted ? "Profile complete" : "Profile not finished"}</Pill>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-fg/8 pt-5">
          {member.status !== "active" ? (
            <Button
              tone="solid"
              size="md"
              disabled={busy}
              onClick={() =>
                onChange(
                  member,
                  "active",
                  member.status === "suspended"
                    ? `${member.fullName} is reactivated and can log in again. We've emailed them to let them know.`
                    : `${member.fullName} is approved and can use the platform. We've emailed them to let them know.`,
                )
              }
            >
              {member.status === "suspended" ? <FaRotateLeft aria-hidden="true" /> : <FaCheck aria-hidden="true" />}
              {member.status === "suspended" ? "Reactivate" : "Approve"}
            </Button>
          ) : null}
          {member.status !== "suspended" && !suspending ? (
            <Button tone="danger" size="md" disabled={busy} onClick={() => setSuspending(true)}>
              <FaBan aria-hidden="true" /> Suspend
            </Button>
          ) : null}
          {canRemind ? (
            <Button tone="gold" size="md" disabled={reminding || remindedAt !== null} onClick={remind}>
              <FaPaperPlane aria-hidden="true" /> {reminding ? "Sending…" : remindedAt ? "Reminder sent" : "Send reminder"}
            </Button>
          ) : null}
        </div>
        {suspending ? (
          <div className="mt-4 space-y-3 rounded-lg border border-danger/25 bg-danger/[0.04] p-4">
            <p className="text-sm text-fg">
              Suspend <strong>{member.fullName}</strong>? They&apos;ll be signed out straight away and can&apos;t log in until you reactivate them.
            </p>
            <Field label="Reason (optional)" hint={`Included in the email we send ${firstName}.`}>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="e.g. We received reports of misleading listing details."
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button tone="danger" size="md" disabled={busy} onClick={() => void suspend()}>
                <FaBan aria-hidden="true" /> {busy ? "Suspending…" : "Suspend member"}
              </Button>
              <Button
                size="md"
                disabled={busy}
                onClick={() => {
                  setSuspending(false);
                  setReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">

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

      <MemberActivity member={member} />

      {isInvestor || isBuyer ? (
        <Card>
          <CardTitle hint={isInvestor ? "Company profile is required for investors; proof of funds is optional." : "Proof of funds is optional for buyers."}>
            Documents
          </CardTitle>
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

        <div className="space-y-6">
      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="grid gap-4">
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
              "Not provided yet: they skipped “Complete your profile”."
            )}
          </Detail>
          <Detail label="Account status">{statusLabel[member.status]}</Detail>
          <Detail label="Profile">{member.profileCompleted ? "Completed" : "Not finished"}</Detail>
          <Detail label="Role">{member.role}</Detail>
          <Detail label="Category">{member.category}</Detail>
          <Detail label="Member ID">{member.id}</Detail>
          <Detail label="Joined">{formatDateTime(member.createdAt)}</Detail>
          <Detail label="Last active">{formatDateTime(member.lastActiveAt)}</Detail>
          <Detail label="Profile last updated">{formatDateTime(member.updatedAt)}</Detail>
        </dl>
      </Card>
        </div>
      </div>
    </div>
  );
}
