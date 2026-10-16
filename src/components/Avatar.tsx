import { cx, initials } from "@/lib/format";

/** Initials in a gold circle — users, request owners, message senders. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-gold-soft font-bold text-gold-deep",
        size === "sm" ? "h-8 w-8 text-[0.6875rem]" : "h-10 w-10 text-xs",
      )}
    >
      {initials(name)}
    </span>
  );
}
