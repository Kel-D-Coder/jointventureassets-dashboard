import type { PillTone } from "@/ui";
import type { AccountStatus, DealType, EnquiryStatus, SubmissionStatus, ListingStatus, PaymentPlan, PlotOption, PropertyType, RequestStatus, PriceNegotiable } from "@/types";
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
  "Government allocation",
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

/** An estate sells either plots of land, or houses / apartments by unit type. */
export type EstateKind = "plots" | "units";

/** A plot or unit row while it's being typed: numbers stay as digits. */
export interface PlotRow {
  /** Units: the unit type, e.g. "2 Bedroom Apartment + BQ". */
  label: string;
  sizeSqm: string;
  price: string;
  priceNegotiable: "" | PriceNegotiable;
  deposit: string;
}

export const emptyPlotRow = (): PlotRow => ({ label: "", sizeSqm: "", price: "", priceNegotiable: "", deposit: "" });

/** A listing's plot or unit options as editable rows; two empty rows to start an estate. */
export function plotRowsFrom(options?: PlotOption[]): PlotRow[] {
  if (!options?.length) return [emptyPlotRow(), emptyPlotRow()];
  return options.map((option) => ({
    label: option.label ?? "",
    sizeSqm: option.sizeSqm ? String(option.sizeSqm) : "",
    price: String(option.price),
    priceNegotiable: option.priceNegotiable ?? "",
    deposit: option.deposit ? String(option.deposit) : "",
  }));
}

const filled = (row: PlotRow) => Boolean(row.label.trim() || row.sizeSqm || row.price || row.deposit || row.priceNegotiable);

/** The complete rows as options, cheapest first. Plots need a size; units need a unit type. Empty rows are ignored. */
export function plotOptionsFrom(rows: PlotRow[], kind: EstateKind = "plots"): PlotOption[] {
  return rows
    .filter((row) => Number(row.price) > 0 && (kind === "units" ? Boolean(row.label.trim()) : Number(row.sizeSqm) > 0))
    .map((row) => ({
      label: kind === "units" ? row.label.trim() : undefined,
      sizeSqm: Number(row.sizeSqm) || 0,
      price: Number(row.price),
      priceNegotiable: row.priceNegotiable || undefined,
      deposit: Number(row.deposit) > 0 ? Number(row.deposit) : undefined,
    }))
    .sort((a, b) => a.price - b.price || a.sizeSqm - b.sizeSqm);
}

/** What's wrong with the rows, if anything: each started row needs a size (plots) or a unit type (units), a price and its negotiability. */
export function plotRowsProblem(rows: PlotRow[], kind: EstateKind = "plots"): string | undefined {
  const started = rows.filter(filled);
  if (kind === "units") {
    if (!started.length) return "Add at least one unit type with its price.";
    if (started.some((row) => !row.label.trim() || !(Number(row.price) > 0) || !row.priceNegotiable)) {
      return "Each unit type needs a name, a price and whether the price is negotiable.";
    }
    return undefined;
  }
  if (!started.length) return "Add at least one plot size with its price.";
  if (started.some((row) => !(Number(row.sizeSqm) > 0) || !(Number(row.price) > 0) || !row.priceNegotiable)) {
    return "Each plot size needs a size, a price and whether the price is negotiable.";
  }
  return undefined;
}

/**
 * True when the listing is an estate: several plot sizes or unit types, or houses / apartments
 * with even one unit type (e.g. many identical 2-bedroom flats, each sold on its own).
 */
export const isEstate = (listing: { estateType?: string; plotOptions?: PlotOption[] }) => {
  const count = listing.plotOptions?.length ?? 0;
  return count > 1 || (count > 0 && estateKind(listing) === "units");
};

/** Houses / apartments when the listing says so, or when its options are named unit types; otherwise plots. */
export const estateKind = (listing: { estateType?: string; plotOptions?: PlotOption[] }): EstateKind =>
  listing.estateType === "units" || Boolean(listing.plotOptions?.some((option) => option.label)) ? "units" : "plots";

/** What an option is called: its unit type, or "500 sqm plot". */
export const optionName = (option: PlotOption) => option.label || `${formatSize(option.sizeSqm)} plot`;

/** What a recorded sale is called: the unit type sold, or "500 sqm plot". */
export const saleName = (sale: { label?: string; plotSizeSqm: number }) => sale.label || `${formatSize(sale.plotSizeSqm)} plot`;

/** "750 sqm", "200–1,000 sqm" for an estate, or "" when no size was given (optional for a sale and for units). */
export function sizeText(listing: { sizeSqm: number; plotOptions?: PlotOption[] }): string {
  if (!isEstate(listing)) return listing.sizeSqm > 0 ? formatSize(listing.sizeSqm) : "";
  const sizes = listing.plotOptions!.map((option) => option.sizeSqm).filter((size) => size > 0);
  if (!sizes.length) return "";
  const [smallest, largest] = [Math.min(...sizes), Math.max(...sizes)];
  return smallest === largest ? formatSize(smallest) : `${smallest.toLocaleString("en-NG")}–${formatSize(largest)}`;
}

/** A listing's `plotOptions` as the server sent them: numbers checked, incomplete rows dropped, cheapest first. */
export function readPlotOptions(raw: unknown): PlotOption[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .map((item) => ({
      label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : undefined,
      sizeSqm: Number(item.sizeSqm) || 0,
      price: Number(item.price) || 0,
      priceNegotiable: priceNegotiableOptions.find((option) => option === item.priceNegotiable),
      deposit: Number(item.deposit) > 0 ? Number(item.deposit) : undefined,
    }))
    .filter((option) => option.price > 0 && (option.sizeSqm > 0 || Boolean(option.label)))
    .sort((a, b) => a.price - b.price || a.sizeSqm - b.sizeSqm);
  return options.length ? options : undefined;
}

// ── Payment plans ──────────────────────────────────────────────────────────

/** A payment plan while it's being typed: numbers stay as digits. */
export interface PaymentPlanDraft {
  initialDeposit: string;
  interestFreeMonths: string;
  maxMonths: string;
  notes: string;
}

export function paymentPlanDraftFrom(plan?: PaymentPlan): PaymentPlanDraft {
  return {
    initialDeposit: plan?.initialDeposit ? String(plan.initialDeposit) : "",
    interestFreeMonths: plan?.interestFreeMonths ? String(plan.interestFreeMonths) : "",
    maxMonths: plan?.maxMonths ? String(plan.maxMonths) : "",
    notes: plan?.notes ?? "",
  };
}

/** The plan to save, or undefined when nothing was filled in. */
export function paymentPlanFrom(draft: PaymentPlanDraft): PaymentPlan | undefined {
  const plan: PaymentPlan = {
    initialDeposit: Number(draft.initialDeposit) > 0 ? Number(draft.initialDeposit) : undefined,
    interestFreeMonths: Number(draft.interestFreeMonths) > 0 ? Number(draft.interestFreeMonths) : undefined,
    maxMonths: Number(draft.maxMonths) > 0 ? Number(draft.maxMonths) : undefined,
    notes: draft.notes.trim() || undefined,
  };
  return Object.values(plan).some((value) => value !== undefined) ? plan : undefined;
}

/** A listing's `paymentPlan` as the server sent it, or undefined when it's empty. */
export function readPaymentPlan(raw: unknown): PaymentPlan | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as Record<string, unknown>;
  return paymentPlanFrom({
    initialDeposit: String(Number(item.initialDeposit) || ""),
    interestFreeMonths: String(Number(item.interestFreeMonths) || ""),
    maxMonths: String(Number(item.maxMonths) || ""),
    notes: typeof item.notes === "string" ? item.notes : "",
  });
}

/** The plan as short phrases: ["₦20m initial deposit", "12 months interest-free", "Up to 18 months to pay"]. */
export function paymentPlanParts(plan?: PaymentPlan): string[] {
  if (!plan) return [];
  const months = (count: number) => `${count} ${count === 1 ? "month" : "months"}`;
  return [
    plan.initialDeposit ? `${formatNairaShort(plan.initialDeposit)} initial deposit` : "",
    plan.interestFreeMonths ? `${months(plan.interestFreeMonths)} interest-free` : "",
    plan.maxMonths ? `Up to ${months(plan.maxMonths)} to pay` : "",
  ].filter(Boolean);
}

/** An estate sets its own facilitation fee to JVA, as a percentage of each plot's sale price, at least this. */
export const MIN_ESTATE_FEE_PERCENT = 5;

/** What's wrong with an estate's fee percentage, if anything. */
export function estateFeeProblem(percent: string): string | undefined {
  const value = Number(percent);
  if (!percent.trim() || Number.isNaN(value)) return "Enter the facilitation fee for JVA, as a percentage.";
  if (value < MIN_ESTATE_FEE_PERCENT) return `The facilitation fee can't be less than ${MIN_ESTATE_FEE_PERCENT}%.`;
  if (value >= 100) return "Enter a percentage below 100.";
  return undefined;
}

/** Digits and one decimal point, for a percentage field: "7.5". */
export const percentDigits = (raw: string) => raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

/** A fee rate (0.075) as a percentage for display or editing ("7.5"). */
export const ratePercent = (rate: number) => String(Math.round(rate * 10000) / 100);

