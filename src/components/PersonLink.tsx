import { Link } from "react-router-dom";
import { useMemberLookup } from "@/hooks/useMembers";

/**
 * A person's name. When they're a registered member it links to their page
 * under Users; otherwise it's plain text with a hint saying so.
 */
export function PersonLink({
  name,
  email,
  userId,
  className,
  showRole = false,
}: {
  name: string;
  email?: string;
  userId?: string;
  className?: string;
  /** Adds "· Landowner member" / "· Not a registered member" after the name. */
  showRole?: boolean;
}) {
  const member = useMemberLookup()({ email, userId });
  const role = showRole ? <span className="font-normal text-muted"> · {member ? `${member.role} member` : "Not a registered member"}</span> : null;

  if (!member) {
    return (
      <span className={className} title="Not a registered member">
        {name}
        {role}
      </span>
    );
  }
  return (
    <span className={className}>
      <Link
        to={`/users/${member.id}`}
        onClick={(event) => event.stopPropagation()}
        className="underline decoration-fg/20 underline-offset-4 transition-colors hover:text-gold-deep hover:decoration-gold"
        title={`Open ${member.fullName}'s member page`}
      >
        {name}
      </Link>
      {role}
    </span>
  );
}
