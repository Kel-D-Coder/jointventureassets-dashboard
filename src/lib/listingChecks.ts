import type { ListingInput } from "@/lib/api";
import { isVideoUrl } from "@/lib/videoWatermark";
import { splitTitles, SHARING_TBD } from "@/data/labels";

/** The company, used as a listing's owner unless another owner is entered. */
export const COMPANY_OWNER = "Joint Venture Assets";

export type CheckedField =
  | "title"
  | "area"
  | "city"
  | "sizeSqm"
  | "price"
  | "description"
  | "ownerName"
  | "images"
  | "titleDocument"
  | "plotOptions"
  | "proposal"
  | "sharingNegotiable"
  | "premium"
  | "priceNegotiable";

export interface Check {
  field: CheckedField;
  /** Short name for the Drafts page's "missing" list. */
  label: string;
  /** Sentence shown under the field in the editor. */
  message: string;
  passes: (listing: ListingInput) => boolean;
}

/**
 * What a listing needs before it can go live. A draft can be saved with any of
 * these missing; publishing requires all of them.
 */
const checks: Check[] = [
  { field: "title", label: "Title", message: "Give the listing a title.", passes: (l) => Boolean(l.title.trim()) },
  { field: "images", label: "Photos", message: "Upload at least one photo.", passes: (l) => l.images.some((url) => !isVideoUrl(url)) },
  { field: "titleDocument", label: "Title documents", message: "Pick at least one title document.", passes: (l) => splitTitles(l.titleDocument).length > 0 },
  { field: "sizeSqm", label: "Size", message: "Enter the size in square metres.", passes: (l) => l.sizeSqm > 0 },
  { field: "price", label: "Price", message: "Enter an amount in naira, or tick TBD for a joint venture.", passes: (l) => l.price > 0 || (l.dealType === "jv" && Boolean(l.landValueTbd)) },
  { field: "area", label: "Area", message: "Add the area.", passes: (l) => Boolean(l.area.trim()) },
  { field: "city", label: "City", message: "Add the city.", passes: (l) => Boolean(l.city.trim()) },
  { field: "description", label: "Description", message: "Describe the property.", passes: (l) => Boolean(l.description.trim()) },
  { field: "ownerName", label: "Owner", message: "Enter the owner's name.", passes: (l) => Boolean(l.ownerName.trim()) },
  {
    field: "sharingNegotiable",
    label: "Negotiable?",
    message: "Say whether the sharing formula is negotiable.",
    passes: (l) => l.dealType !== "jv" || l.jv?.sharingFormula === SHARING_TBD || l.jv?.sharingNegotiable !== undefined,
  },
  {
    field: "premium",
    label: "Premium",
    message: "Say whether there's a premium, and enter the amount if there is.",
    passes: (l) => l.dealType !== "jv" || l.jv?.premium !== undefined,
  },
];

// Sale listings say how open the asking price is.
checks.push({
  field: "priceNegotiable",
  label: "Negotiable?",
  message: "Say whether the price is negotiable.",
  passes: (l) => l.dealType !== "sale" || Boolean(l.priceNegotiable),
});

const jvOnly: CheckedField[] = ["sharingNegotiable", "premium"];

/** The checks a listing fails, in the order a person would fill the form. */
export function missingFor(listing: ListingInput): Check[] {
  return checks.filter((check) => !check.passes(listing));
}

/** 0–100: how much of the required information a draft has. */
export function completeness(listing: ListingInput): number {
  const applicable = checks.filter(
    (check) => (!jvOnly.includes(check.field) || listing.dealType === "jv") && (check.field !== "priceNegotiable" || listing.dealType === "sale"),
  );
  const done = applicable.filter((check) => check.passes(listing)).length;
  return Math.round((done / applicable.length) * 100);
}
