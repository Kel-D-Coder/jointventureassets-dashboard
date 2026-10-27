import type { PillTone } from "@/ui";
import type { AccountStatus, DealType, EnquiryStatus, SubmissionStatus, ListingStatus, PlotOption, PropertyType, RequestStatus, PriceNegotiable } from "@/types";
import { formatNaira, formatNairaShort, formatSize } from "@/lib/format";

export const dealTypeLabel: Record<DealType, string> = {
  jv: "Joint venture",
  sale: "For sale",
};

export const propertyTypeLabel: Record<PropertyType, string> = {
  land: "Land",
  residential: "Residential",
  commercial: "Commercial",
  mixed_use: "Mixed use",
};

export const listingStatusLabel: Record<ListingStatus, string> = {
  published: "Live",
  draft: "Draft",
  under_offer: "Under offer",
  closed: "Closed",
};

export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
};

export { requestTypeLabel } from "@/lib/requestBrief";

export const titleDocuments = [
  "C of O",
  "Global C of O",
  "Governor's Consent",
  "Deed of Assignment",
  "Excision",
  "Gazette",
  "Registered Survey",
  "Survey plan only",
];

export const sharingFormulas = ["30/70", "35/65", "40/60", "50/50", "55/45", "60/40", "TBD"];

/** "TBD" means the split is still to be discussed. */
export const SHARING_TBD = "TBD";

/** For showing a listing's sharing formula: "40/60", or "To be discussed". */
export const sharingFormulaLabel = (formula: string) => (formula === SHARING_TBD ? "To be discussed" : formula);

/** For the sharing formula dropdowns. */
export const sharingFormulaOptions = sharingFormulas.map((value) => ({ value, label: value === SHARING_TBD ? "TBD (to be discussed)" : value }));

/** Can't be combined with a real title, so picking it clears the others (and the other way round). */
export const SURVEY_PLAN_ONLY = "Survey plan only";

/**
 * A listing can have several title documents. The server keeps them in its one `titleDocument`
 * text field, comma-separated ("C of O, Deed of Assignment"), which is also how they're shown.
 */
export const splitTitles = (value?: string): string[] => (value ?? "").split(",").map((title) => title.trim()).filter(Boolean);

/** Back to the stored text, in the usual order. */
export const joinTitles = (titles: string[]): string =>
  [...titleDocuments.filter((title) => titles.includes(title)), ...titles.filter((title) => !titleDocuments.includes(title))].join(", ");

/** "Registered Survey" already is a survey plan, so it isn't asked for twice. */
const REGISTERED_SURVEY = "Registered Survey";

/** What to upload for the ticked titles: each title, plus the survey plan by default. */
export function documentsToUpload(titleDocument: string): string[] {
  const titles = splitTitles(titleDocument).filter((title) => title !== SURVEY_PLAN_ONLY);
  return titles.includes(REGISTERED_SURVEY) ? titles : [...titles, "Survey plan"];
}

/** ["C of O", "Deed of Assignment", "Survey plan"] -> "C of O, Deed of Assignment and Survey plan". */
export const listInWords = (items: string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** Ticks or unticks one title. */
export function toggleTitle(current: string, title: string): string {
  const titles = splitTitles(current);
  if (titles.includes(title)) return joinTitles(titles.filter((other) => other !== title));
  if (title === SURVEY_PLAN_ONLY) return title;
  return joinTitles([...titles.filter((other) => other !== SURVEY_PLAN_ONLY), title]);
}


export const enquiryStatusLabel: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
export const enquiryStatusTone: Record<EnquiryStatus, PillTone> = { new: "gold", contacted: "info", closed: "neutral" };

export const submissionStatusLabel: Record<SubmissionStatus, string> = { draft: "Draft", pending: "Pending review", approved: "Approved", rejected: "Rejected" };
export const submissionStatusTone: Record<SubmissionStatus, PillTone> = { draft: "neutral", pending: "warning", approved: "success", rejected: "danger" };

export const accountStatusLabel: Record<AccountStatus, string> = { pending: "Awaiting approval", active: "Active", suspended: "Suspended" };
export const accountStatusTone: Record<AccountStatus, PillTone> = { pending: "warning", active: "success", suspended: "danger" };

/** Sale listings: how open the asking price is. */
export const priceNegotiableLabel: Record<PriceNegotiable, string> = {
  negotiable: "Negotiable",
  slightly_negotiable: "Slightly negotiable",
  fixed: "Not negotiable",
};
export const priceNegotiableOptions = Object.keys(priceNegotiableLabel) as PriceNegotiable[];

/**
 * A joint-venture listing's land value can be "to be determined": saved as price 0 with
 * `landValueTbd`. A live JV listing with no land value counts as TBD too, so it never shows ₦0.
 */
export function isLandValueTbd(listing: { dealType: DealType; price: number; landValueTbd?: boolean; status?: string }): boolean {
  return listing.dealType === "jv" && (Boolean(listing.landValueTbd) || (listing.price <= 0 && listing.status !== "draft"));
}

/** "₦150,000,000" (or "₦150M" when short), or "To be determined" ("TBD") for a JV land value that's TBD. */
export function priceText(
  listing: { dealType: DealType; price: number; landValueTbd?: boolean; status?: string; plotOptions?: PlotOption[] },
  short = false,
): string {
  if (isLandValueTbd(listing)) return short ? "TBD" : "To be determined";
  // Estates: the cheapest plot, as "From ₦12M".
  if (isEstate(listing)) {
    const cheapest = Math.min(...listing.plotOptions!.map((option) => option.price));
    return `From ${short ? formatNairaShort(cheapest) : formatNaira(cheapest)}`;
  }
  return short ? formatNairaShort(listing.price) : formatNaira(listing.price);
}

// ── Estates: listings with several plot sizes ───────────────────────────────

/** A plot row while it's being typed: numbers stay as digits. */
export interface PlotRow {
  sizeSqm: string;
  price: string;
  priceNegotiable: "" | PriceNegotiable;
  deposit: string;
}

export const emptyPlotRow = (): PlotRow => ({ sizeSqm: "", price: "", priceNegotiable: "", deposit: "" });

/** A listing's plot options as editable rows; two empty rows to start an estate. */
export function plotRowsFrom(options?: PlotOption[]): PlotRow[] {
  if (!options?.length) return [emptyPlotRow(), emptyPlotRow()];
  return options.map((option) => ({
    sizeSqm: String(option.sizeSqm),
    price: String(option.price),
    priceNegotiable: option.priceNegotiable ?? "",
    deposit: option.deposit ? String(option.deposit) : "",
  }));
}

const filled = (row: PlotRow) => Boolean(row.sizeSqm || row.price || row.deposit || row.priceNegotiable);

/** The complete rows as plot options, cheapest first. Empty rows are ignored. */
export function plotOptionsFrom(rows: PlotRow[]): PlotOption[] {
  return rows
    .filter((row) => Number(row.sizeSqm) > 0 && Number(row.price) > 0)
    .map((row) => ({
      sizeSqm: Number(row.sizeSqm),
      price: Number(row.price),
      priceNegotiable: row.priceNegotiable || undefined,
      deposit: Number(row.deposit) > 0 ? Number(row.deposit) : undefined,
    }))
    .sort((a, b) => a.price - b.price || a.sizeSqm - b.sizeSqm);
}

/** What's wrong with the plot rows, if anything: each started row needs a size, a price and its negotiability. */
export function plotRowsProblem(rows: PlotRow[]): string | undefined {
  const started = rows.filter(filled);
  if (!started.length) return "Add at least one plot size with its price.";
  if (started.some((row) => !(Number(row.sizeSqm) > 0) || !(Number(row.price) > 0) || !row.priceNegotiable)) {
    return "Each plot size needs a size, a price and whether the price is negotiable.";
  }
  return undefined;
}

/** True when the listing is an estate with more than one plot size. */
export const isEstate = (listing: { plotOptions?: PlotOption[] }) => (listing.plotOptions?.length ?? 0) > 1;

/** "750 sqm", "200–1,000 sqm" for an estate, or "" when no size was given (it's optional for a sale). */
export function sizeText(listing: { sizeSqm: number; plotOptions?: PlotOption[] }): string {
  if (!isEstate(listing)) return listing.sizeSqm > 0 ? formatSize(listing.sizeSqm) : "";
  const sizes = listing.plotOptions!.map((option) => option.sizeSqm);
  return `${Math.min(...sizes).toLocaleString("en-NG")}–${formatSize(Math.max(...sizes))}`;
}

/** A listing's `plotOptions` as the server sent them: numbers checked, incomplete rows dropped, cheapest first. */
export function readPlotOptions(raw: unknown): PlotOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .map((item) => ({
      sizeSqm: Number(item.sizeSqm) || 0,
      price: Number(item.price) || 0,
      priceNegotiable: priceNegotiableOptions.find((option) => option === item.priceNegotiable),
      deposit: Number(item.deposit) > 0 ? Number(item.deposit) : undefined,
    }))
    .filter((option) => option.sizeSqm > 0 && option.price > 0)
    .sort((a, b) => a.price - b.price || a.sizeSqm - b.sizeSqm);
  return options.length ? options : undefined;
}
