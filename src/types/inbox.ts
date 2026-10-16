/**
 * Records shared with the website through its demo inbox (/api/demo-inbox).
 * The website keeps the original in lib/inbox/types.ts; change both together.
 */
import type { DealType, PropertyType } from "@/types";

export type EnquiryStatus = "new" | "contacted" | "closed";

/** Someone asking about a listing or about another member's request. */
export interface InboxEnquiry {
  id: string;
  kind: "enquiry";
  target: {
    type: "listing" | "request";
    id: string;
    /** Copied at the time of the enquiry, so it still reads well if the item changes. */
    title: string;
    subtitle?: string;
    image?: string;
  };
  fullName: string;
  email: string;
  phoneNumber: string;
  message: string;
  /** Joint-venture listings only: the developer's answers about moving forward. */
  jv?: JvEnquiryTerms;
  status: EnquiryStatus;
  createdAt: string;
}

/** Asked on joint-venture enquiries. The facilitation fee terms must be accepted to send one. */
export interface JvEnquiryTerms {
  /** Whether they want JVA to prepare their Letter of Intent when they move forward. */
  generateLoi: boolean;
  /** Their company letterhead (PNG or JPG). Required when generateLoi is true: the LOI is printed on it. */
  letterhead?: SubmittedDocument;
  /** They agreed that JVA prepares the Facilitation Fee Agreement at 10% of the land value, non-negotiable. */
  acceptedFeeTerms: true;
}

/** "draft" is only visible to the person who saved it; the admin sees a submission once it's pending. */
export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";

/** A title document (C of O, survey plan, deed…) uploaded with a listing submission. */
export interface SubmittedDocument {
  name: string;
  /** MIME type, e.g. application/pdf or image/jpeg. */
  type: string;
  size: number;
  /** The file itself as a data URL, or a path for demo files. */
  url: string;
}

/** The property details a visitor submits; the same fields the admin fills when creating a listing. */
export interface SubmittedListing {
  title: string;
  dealType: DealType;
  propertyType: PropertyType;
  area: string;
  city: string;
  state: string;
  sizeSqm: number;
  price: number;
  titleDocument: string;
  description: string;
  highlights: string[];
  images: string[];
  jv?: { sharingFormula: string; sharingNegotiable?: boolean; premium?: number; proposal: string; duration: string };
  ownerName: string;
}

/** A visitor asking for their property to be listed. Reviewed in the dashboard's "Listing requests". */
export interface ListingSubmission {
  id: string;
  kind: "listing-submission";
  status: SubmissionStatus;
  listing: SubmittedListing;
  /** Title documents for verification. Older demo records may not have any. */
  documents?: SubmittedDocument[];
  contact: { fullName: string; email: string; phoneNumber: string };
  /** True when the person submitting is the owner; false for an agent or relative. */
  isOwner: boolean;
  reviewNote?: string;
  /** The dashboard listing created from this submission. */
  listingId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberRole = "Landowner" | "Investor" | "Buyer" | "Admin";

/** "pending" until the JVA team approves the account; "suspended" accounts can't log in. */
export type AccountStatus = "pending" | "active" | "suspended";

/** Files a member uploads with their profile. Investors must provide a company profile. */
export interface ProfileDocuments {
  companyProfile?: SubmittedDocument;
  proofOfFunds?: SubmittedDocument;
}

/** A registered member, as the admin and the member themselves see it (no password). */
export interface MemberAccount {
  id: string;
  kind: "account";
  fullName: string;
  email: string;
  role: MemberRole;
  category: string;
  phoneNumber: string;
  /** Answers from "Complete your profile", keyed by field name (see components/auth/ProfileFields.tsx). */
  profile: Record<string, string>;
  documents: ProfileDocuments;
  profileCompleted: boolean;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

/** Server-side only: an account with its (demo, unhashed) password. Never sent to a browser. */
export interface StoredAccount extends MemberAccount {
  password: string;
}

export type InboxItem = InboxEnquiry | ListingSubmission | StoredAccount;

/** What the API sends back: accounts without their password. */
export type PublicItem = InboxEnquiry | ListingSubmission | MemberAccount;

export type NewEnquiry = Omit<InboxEnquiry, "id" | "status" | "createdAt">;
export type NewListingSubmission = Omit<ListingSubmission, "id" | "status" | "createdAt" | "updatedAt" | "reviewNote" | "listingId"> & {
  /** True to save as a draft instead of sending it for review. */
  draft?: boolean;
};
