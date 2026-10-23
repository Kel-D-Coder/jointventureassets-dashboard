import type { PillTone } from "@/ui";
import type { AccountStatus, DealType, EnquiryStatus, SubmissionStatus, ListingStatus, PropertyType, RequestStatus } from "@/types";

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
  "Survey plan only",
];

export const sharingFormulas = ["30/70", "35/65", "40/60", "50/50", "60/40"];

export const enquiryStatusLabel: Record<EnquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
export const enquiryStatusTone: Record<EnquiryStatus, PillTone> = { new: "gold", contacted: "info", closed: "neutral" };

export const submissionStatusLabel: Record<SubmissionStatus, string> = { draft: "Draft", pending: "Pending review", approved: "Approved", rejected: "Rejected" };
export const submissionStatusTone: Record<SubmissionStatus, PillTone> = { draft: "neutral", pending: "warning", approved: "success", rejected: "danger" };

export const accountStatusLabel: Record<AccountStatus, string> = { pending: "Awaiting approval", active: "Active", suspended: "Suspended" };
export const accountStatusTone: Record<AccountStatus, PillTone> = { pending: "warning", active: "success", suspended: "danger" };
