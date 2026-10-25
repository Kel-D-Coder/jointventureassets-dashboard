import type { PillTone } from "@/ui";
import type { AccountStatus, DealType, EnquiryStatus, SubmissionStatus, ListingStatus, PropertyType, RequestStatus, PriceNegotiable } from "@/types";

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
