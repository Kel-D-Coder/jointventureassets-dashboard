const LAGOS_TIME_ZONE = "Africa/Lagos";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** 12000 -> "₦12,000" */
export function formatNaira(amount: number): string {
  return nairaFormatter.format(amount);
}

/** 1_450_000_000 -> "₦1.45bn", 65_000_000 -> "₦65m" — for cards and tables. */
export function formatNairaShort(amount: number): string {
  if (amount >= 1_000_000_000) return `₦${trim(amount / 1_000_000_000)}bn`;
  if (amount >= 1_000_000) return `₦${trim(amount / 1_000_000)}m`;
  if (amount >= 1_000) return `₦${trim(amount / 1_000)}k`;
  return formatNaira(amount);
}

function trim(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

/** 50000 -> "5 ha", 2400 -> "2,400 sqm" */
export function formatSize(sqm: number): string {
  if (sqm >= 10_000) return `${trim(sqm / 10_000)} ha`;
  return `${sqm.toLocaleString("en-NG")} sqm`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: LAGOS_TIME_ZONE,
  }).format(new Date(iso));
}

/** "3 hours ago", "2 days ago" — for activity lists. */
export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit);
  }
  return "just now";
}

/** "Adebayo Okonkwo" -> "AO" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Joins class names, dropping anything falsy. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** "1000000" -> "1,000,000", for showing an amount while it's being typed. */
export function withCommas(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "₦25,000,000", "No premium", or "Not stated" for records from before premiums were asked. */
export function premiumText(premium?: number): string {
  if (premium === undefined) return "Not stated";
  return premium > 0 ? formatNaira(premium) : "No premium";
}

/** "Negotiable", "Fixed", or "Not stated". */
export function negotiableText(negotiable?: boolean): string {
  return negotiable === undefined ? "Not stated" : negotiable ? "Negotiable" : "Fixed";
}
