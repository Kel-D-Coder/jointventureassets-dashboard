import type { ReactNode } from "react";
import { FaEnvelope, FaPhone } from "react-icons/fa6";
import { useMemberLookup } from "@/hooks/useMembers";
import { Avatar } from "@/components/Avatar";
import { PersonLink } from "@/components/PersonLink";
import { Card, CardTitle } from "@/ui";

/** Who sent something: name (linking to their member page when they have one), email, phone. */
export function ContactCard({
  title,
  name,
  email,
  phone,
  userId,
  note,
  emailSubject,
  children,
}: {
  title: string;
  name: string;
  email?: string;
  phone?: string;
  userId?: string;
  /** A line under the name, e.g. "The owner". */
  note?: string;
  emailSubject?: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="flex items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0">
          <PersonLink name={name} email={email} userId={userId} className="block truncate font-semibold text-fg" />
          <PersonRole email={email} userId={userId} note={note} />
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {email ? (
          <a
            href={`mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ""}`}
            className="flex items-center gap-2 break-all text-muted hover:text-fg"
          >
            <FaEnvelope aria-hidden="true" className="shrink-0" /> {email}
          </a>
        ) : (
          <p className="text-muted">No email</p>
        )}
        {phone ? (
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-muted hover:text-fg">
            <FaPhone aria-hidden="true" className="shrink-0" /> {phone}
          </a>
        ) : (
          <p className="text-muted">No phone number</p>
        )}
      </div>
      {children}
    </Card>
  );
}


function PersonRole({ email, userId, note }: { email?: string; userId?: string; note?: string }) {
  const member = useMemberLookup()({ email, userId });
  const role = member ? `${member.role} member` : "";
  const line = [note, role].filter(Boolean).join(" · ");
  return line ? <p className="text-xs text-muted">{line}</p> : null;
}
