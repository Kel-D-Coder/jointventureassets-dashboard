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
  /** The listing's video, if it has one (at most one), watermarked like the photos. */
  videos?: string[];
  /** Copies of the title documents, for verifying ownership. Admin only; never shown on the website. */
  supportedDocuments?: SubmittedDocument[];
  jv?: JvTerms;
  ownerName: string;
  /** The owner's member account, when the owner is a member of the platform. */
  userId?: string;
  /** The owner's contact details. Admin only; the website never shows them. */
  ownerEmail?: string;
  ownerPhone?: string;
  /** Listed under Joint Venture Assets: the actual owner's name, for the JVA team only. */
  ownerContactName?: string;
  status: ListingStatus;
  /** Sale listings: whether the asking price is negotiable. Missing on older listings. */
  priceNegotiable?: PriceNegotiable;
  /** Joint ventures: the land value is still to be determined (price is then 0). */
  landValueTbd?: boolean;
  /** Sales: the facilitation fee the seller agreed to pay JVA. Estates set their own rate (at least 5%). */
  saleTerms?: { acceptedFeeTerms: true; feeRate: number };
  /** Estates: the plot sizes on offer, each with its own price. sizeSqm and price then hold the cheapest plot. */
  plotOptions?: PlotOption[];
  /** Estates: "plots" (plots of land) or "units" (houses / apartments). */
  estateType?: "plots" | "units";
  /** Estates: how buyers can pay. */
  paymentPlan?: PaymentPlan;
  /** Estates: the plots sold so far, oldest first. Recorded one at a time (api.plotSales), not saved with the listing. */
  sales?: PlotSale[];
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
/**
 * What a member wants JVA to find: a joint venture, land to buy, a property to
 * buy, a development project, or a professional partner. (Older "land" requests
 * from before 2026-10-18 were offers of land.)
 */
export type RequestType = "jv" | "land" | "purchase" | "development" | "partnership";

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
  /** Joint ventures: what they plan to build. */
  housingProposal?: string;
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
  /** Bearer token from POST /auth/login. */
  token: string;
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

/** Sale listings: how much room there is on the asking price. */
export type PriceNegotiable = "negotiable" | "slightly_negotiable" | "fixed";

/**
 * One plot size in an estate listing (a sale listing with several plot sizes): its size, price,
 * how negotiable that price is, and the optional initial deposit.
 */
export interface PlotOption {
  /** Houses / apartments: the unit type, e.g. "2 Bedroom Apartment + BQ". Missing for plots of land. */
  label?: string;
  /** Plots: the plot size. Units: optional (0 when not given). */
  sizeSqm: number;
  /** Naira. */
  price: number;
  priceNegotiable?: PriceNegotiable;
  /** Initial deposit to secure the plot, in naira; optional. */
  deposit?: number;
}

/**
 * One plot sold from an estate: the usual closing record plus the plot size. An estate stays live
 * while its plots sell; each sale shows on the Closed deals page.
 */
export interface PlotSale extends DealClosing {
  id: string;
  plotSizeSqm: number;
  /** The buyer's member account, when they were picked from the platform's members. */
  buyerUserId?: string;
  /** Houses / apartments: the unit type sold, e.g. "3 Bedroom Apartment + BQ". */
  label?: string;
}

/** How a buyer can pay for an estate plot or unit; every part is optional. */
export interface PaymentPlan {
  /** Naira. */
  initialDeposit?: number;
  interestFreeMonths?: number;
  /** The longest payment plan, in months. */
  maxMonths?: number;
  notes?: string;
}
