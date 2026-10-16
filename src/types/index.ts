import type { SubmittedDocument } from "./inbox";

/** "jv" = joint-venture partnership on the land; "sale" = an outright purchase. */
export type DealType = "jv" | "sale";

export type PropertyType = "land" | "residential" | "commercial" | "mixed_use";

export type ListingStatus = "published" | "draft" | "under_offer" | "closed";

export interface JvTerms {
  /** Landowner / developer split, e.g. "40/60". */
  sharingFormula: string;
  /** Whether the landowner is open to discussing the split. Missing on older records. */
  sharingNegotiable?: boolean;
  /** Upfront premium the developer pays the landowner, in naira; 0 means no premium. Missing on older records. */
  premium?: number;
  /** What the developer is expected to build. */
  proposal: string;
  /** Estimated build period, e.g. "24 months". */
  duration: string;
}

export interface Listing {
  id: string;
  title: string;
  dealType: DealType;
  propertyType: PropertyType;
  area: string;
  city: string;
  state: string;
  sizeSqm: number;
  /** Asking price for a sale; land value for a JV. Naira. */
  price: number;
  titleDocument: string;
  description: string;
  highlights: string[];
  images: string[];
  jv?: JvTerms;
  ownerName: string;
  /** The owner's contact details. Admin only; the website never shows them. */
  ownerEmail?: string;
  ownerPhone?: string;
  status: ListingStatus;
  featured: boolean;
  verified: boolean;
  views: number;
  /** Set when the listing was created from a website listing submission. */
  sourceSubmissionId?: string;
  /** Recorded when the listing is marked closed: who it closed with, for how much, and the signed documents. */
  closing?: DealClosing;
  createdAt: string;
}

/** The record of a closed deal, kept on the listing. */
export interface DealClosing {
  /** ISO date and time the deal closed. */
  closedAt: string;
  /** The buyer (sale) or developer / investor (joint venture). */
  counterparty: { name: string; email: string; phone: string };
  /** Agreed sale price, or the agreed land value for a joint venture. Naira. */
  finalAmount: number;
  /** JVA's facilitation fee. Naira. */
  facilitationFee: number;
  /** Signed agreements, receipts and anything else used to close. */
  documents: SubmittedDocument[];
  notes: string;
}

export type RequestStatus = "pending" | "accepted" | "rejected";
/** "land": offering land or property. "purchase": wanting to buy it. */
export type RequestType = "land" | "purchase" | "development" | "partnership";

export interface PartnerRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: RequestStatus;
  requestType: RequestType;
  budget: number;
  location: string;
  timeline: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  documents: string[];
  developmentType?: string;
  partnershipType?: string;
  landSize?: string;
  titleDocument?: string;
  sharingFormula?: string;
  /** Land offers: whether the sharing formula is open to negotiation. */
  sharingNegotiable?: boolean;
  /** Land offers: upfront premium expected from the developer, in naira; 0 means none. */
  premium?: number;
  /** Purchase requests: what they want to buy and how they'll pay. */
  propertyWanted?: string;
  paymentMethod?: string;
  /** Left by the reviewer when a request is accepted or rejected. */
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  consultationType: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AdminSession {
  name: string;
  email: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export type {
  AccountStatus,
  EnquiryStatus,
  InboxEnquiry,
  ListingSubmission,
  MemberAccount,
  MemberRole,
  ProfileDocuments,
  SubmissionStatus,
  SubmittedDocument,
  SubmittedListing,
} from "./inbox";
