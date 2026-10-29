/**
 * A request is a brief: what a member wants JVA to find for them. "I want a
 * JV in Lekki, my budget is ₦500m, no premium." Shared by the new-request and
 * edit pages, the request cards and the request page.
 *
 * Copied from the website's lib/requests.ts (labels and the summary only); change both together.
 */
import type { PartnerRequest, RequestType } from "@/types";

export const requestTypes: RequestType[] = ["jv", "land", "purchase", "development", "partnership"];

export const requestTypeLabel: Record<RequestType, string> = {
  jv: "Joint venture",
  land: "Land",
  purchase: "Property",
  development: "Development project",
  partnership: "Professional partner",
};

export const requestTypeHint: Record<RequestType, string> = {
  jv: "Land or a building for a joint venture, within your budget and premium.",
  land: "Land to buy outright, in the area and size you want.",
  purchase: "A house, building or commercial property to buy.",
  development: "A site or project to develop or invest in.",
  partnership: "A lawyer, property consultant, mandate or building expert.",
};

type Option = { value: string; label: string };

export const jvPropertyKinds: Option[] = [
  { value: "land", label: "Land" },
  { value: "building", label: "A building to redevelop" },
];
export const propertiesWanted: Option[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed_use", label: "Mixed use" },
];
export const developmentTypes: Option[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "agricultural", label: "Agricultural" },
];
export const partnershipTypes: Option[] = [
  { value: "mandate", label: "Mandate" },
  { value: "lawyer", label: "Property lawyer" },
  { value: "property_consultant", label: "Property consultant" },
  { value: "building_expert", label: "Building expert" },
];
/** Older requests picked one of these; new ones are typed (e.g. "6 units of apartments"), which labelOf shows as typed. */
export const housingProposals: Option[] = [
  { value: "apartment", label: "Apartments" },
  { value: "duplex", label: "Duplexes" },
  { value: "maisonette", label: "Maisonettes" },
  { value: "bungalows", label: "Bungalows" },
  { value: "condos", label: "Condos" },
];
export const titleDocuments: Option[] = [
  { value: "c_of_o", label: "C of O" },
  { value: "global_c_of_o", label: "Global C of O" },
  { value: "governors_consent", label: "Governor's Consent" },
  { value: "deed_of_assignment", label: "Deed of Assignment" },
  { value: "excision", label: "Excision" },
  { value: "gazzette", label: "Gazette" },
  { value: "government_allocation", label: "Government allocation" },
  { value: "reg_survey", label: "Registered Survey" },
  { value: "any", label: "Any verified title" },
];
export const sharingFormulas: Option[] = [
  { value: "30_70", label: "30% / 70%" },
  { value: "40_60", label: "40% / 60%" },
  { value: "50_50", label: "50% / 50%" },
  { value: "55_45", label: "55% / 45%" },
  { value: "60_40", label: "60% / 40%" },
  { value: "open", label: "Open to discussion" },
];
export const paymentMethods: Option[] = ["Outright payment", "Installments", "Mortgage", "Not sure yet"].map((value) => ({ value, label: value }));

/** The label for a stored value, or the value itself for older free-text answers. */
export function labelOf(options: Option[], value?: string): string {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label ?? value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** "1450000000" -> "₦1.45bn"; "₦25,000,000" -> "₦25m". */
export function shortNaira(amount: string | number | undefined): string {
  const value = Number(String(amount ?? "").replace(/[^\d.]/g, ""));
  if (!value) return "";
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
  if (value >= 1_000_000_000) return `₦${trim(value / 1_000_000_000)}bn`;
  if (value >= 1_000_000) return `₦${trim(value / 1_000_000)}m`;
  return `₦${value.toLocaleString("en-NG")}`;
}

type BriefFields = Pick<
  PartnerRequest,
  "requestType" | "location" | "budget" | "landSize" | "propertyWanted" | "developmentType" | "partnershipType" | "housingProposal" | "premium" | "titleDocument" | "sharingFormula"
>;

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** A short headline, used as the request's title: "Joint venture in Lekki". */
export function requestTitle(request: BriefFields): string {
  const where = request.location?.trim() ? ` in ${request.location.trim()}` : "";
  switch (request.requestType) {
    case "jv":
      return `Joint venture${request.propertyWanted === "building" ? " on a building" : " on land"}${where}`;
    case "land":
      return `Land to buy${where}`;
    case "purchase":
      return `${labelOf(propertiesWanted, request.propertyWanted) || "Property"} property to buy${where}`;
    case "development":
      return `${labelOf(developmentTypes, request.developmentType) || "Development"} project${where}`;
    case "partnership":
      return `${labelOf(partnershipTypes, request.partnershipType) || "Professional partner"} wanted${where}`;
    default:
      return `Request${where}`;
  }
}

/** The brief in one or two sentences: "I want a joint venture on land in Lekki. Budget up to ₦500m. No premium." */
export function requestSummary(request: BriefFields): string {
  const where = request.location?.trim() ? ` in ${request.location.trim()}` : "";
  const size = request.landSize?.trim() ? `, ${request.landSize.trim()}` : "";
  const budget = shortNaira(request.budget);
  const parts: string[] = [];

  switch (request.requestType) {
    case "jv":
      parts.push(`I want a joint venture on ${request.propertyWanted === "building" ? "a building to redevelop" : "land"}${where}${size}.`);
      if (request.housingProposal) parts.push(`I plan to build ${lower(labelOf(housingProposals, request.housingProposal))}.`);
      if (budget) parts.push(`Budget up to ${budget}.`);
      if (request.premium !== undefined && request.premium !== null) {
        parts.push(Number(request.premium) > 0 ? `Premium up to ${shortNaira(request.premium)}.` : "No premium.");
      }
      break;
    case "land":
      parts.push(`I want to buy land${where}${size}.`);
      if (budget) parts.push(`Budget up to ${budget}.`);
      break;
    case "purchase": {
      const kind = labelOf(propertiesWanted, request.propertyWanted);
      parts.push(`I want to buy ${kind ? `a ${lower(kind)} property` : "a property"}${where}.`);
      if (budget) parts.push(`Budget up to ${budget}.`);
      break;
    }
    case "development": {
      const kind = labelOf(developmentTypes, request.developmentType);
      parts.push(`I want ${kind ? `a ${lower(kind)}` : "a"} development project${where}${size}.`);
      if (budget) parts.push(`Budget up to ${budget}.`);
      break;
    }
    case "partnership": {
      const who = labelOf(partnershipTypes, request.partnershipType);
      parts.push(`I'm looking for ${who ? `a ${lower(who)}` : "a professional partner"}${where}.`);
      if (budget) parts.push(`Budget up to ${budget}.`);
      break;
    }
  }
  return parts.join(" ");
}
