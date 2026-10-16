import type { DealType, ListingStatus, PropertyType, RequestStatus, RequestType } from "@/types";

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

export const requestTypeLabel: Record<RequestType, string> = {
  land: "Land offer",
  purchase: "Purchase request",
  development: "Development",
  partnership: "Partnership",
};

export const titleDocuments = [
  "C of O",
  "Governor's Consent",
  "Deed of Assignment",
  "Excision",
  "Gazette",
  "Survey plan only",
];

export const sharingFormulas = ["30/70", "35/65", "40/60", "50/50", "60/40"];
