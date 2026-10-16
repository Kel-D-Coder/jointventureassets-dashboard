/**
 * Enquiries and listing submissions come from the website's demo inbox
 * (/api/demo-inbox on the Next.js site), so anything a visitor sends there
 * shows up here. The website must be running for these pages to load.
 * Replace with the real API's endpoints when the backend is reconnected.
 */
import { websiteUrl } from "@/data/site";
import type { AccountStatus, EnquiryStatus, InboxEnquiry, ListingSubmission, MemberAccount, SubmissionStatus } from "@/types";

const BASE = websiteUrl("/api/demo-inbox");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // Only requests with a body send JSON headers; a plain GET then needs no CORS preflight.
    response = await fetch(`${BASE}${path}`, init?.body ? { ...init, headers: { "Content-Type": "application/json" } } : init);
  } catch {
    throw new Error(`Couldn't reach the website at ${websiteUrl()}. Enquiries and listing requests come from it, so start it with "npm run dev".`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { message?: string }).message ?? "The website's inbox returned an error.");
  return body as T;
}

// Several parts of a page (the sidebar badges, the page itself) often ask for the same list at once; they share one request.
const inFlight = new Map<string, Promise<unknown>>();

function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method && init.method !== "GET") return request<T>(path, init);
  let shared = inFlight.get(path) as Promise<T> | undefined;
  if (!shared) {
    shared = request<T>(path).finally(() => inFlight.delete(path));
    inFlight.set(path, shared);
  }
  return shared.then((result) => structuredClone(result));
}

const patch = <T>(id: string, changes: object) =>
  call<T>(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(changes) });

export const inboxEnquiries = {
  list: () => call<InboxEnquiry[]>("?kind=enquiry"),
  get: (id: string) => call<InboxEnquiry>(`/${encodeURIComponent(id)}`),
  setStatus: (id: string, status: EnquiryStatus) => patch<InboxEnquiry>(id, { status }),
  remove: (id: string) => call<unknown>(`/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const listingSubmissions = {
  /** Drafts belong to the person still writing them, so the admin never sees them. */
  list: async () => (await call<ListingSubmission[]>("?kind=listing-submission")).filter((submission) => submission.status !== "draft"),
  get: (id: string) => call<ListingSubmission>(`/${encodeURIComponent(id)}`),
  review: (id: string, changes: { status?: SubmissionStatus; reviewNote?: string; listingId?: string }) =>
    patch<ListingSubmission>(id, changes),
  remove: (id: string) => call<unknown>(`/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Members who signed up on the website, with what they entered when registering. The admin account is left out. */
export const accounts = {
  list: async () => (await call<MemberAccount[]>("?kind=account")).filter((account) => account.role !== "Admin"),
  get: (id: string) => call<MemberAccount>(`/${encodeURIComponent(id)}`),
  setStatus: (id: string, status: AccountStatus) => patch<MemberAccount>(id, { status }),
};

/**
 * Asks the backend to email a member who hasn't finished their profile.
 * TODO(backend): replace with the real endpoint, e.g. POST /admin/users/{id}/profile-reminder.
 * In demo mode nothing is sent; it only waits like a request would.
 */
export async function sendProfileReminder(_memberId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/** A filled-in document going to a member to review and sign. */
export interface SignatureRequest {
  templateId: string;
  documentName: string;
  memberId: string;
  memberName: string;
  email: string;
  /** Optional note shown in the email above the signing link. */
  message: string;
  /** Every field value, so the backend can render the same document. */
  values: Record<string, string>;
}

/**
 * Emails a document to a member so they can review and sign it.
 * TODO(backend): replace with the real endpoint, e.g. POST /admin/documents/send-for-signature,
 * which should render the PDF from `templateId` + `values`, create the e-signature request
 * and email the signing link to `email`. In demo mode nothing is sent.
 */
export async function sendDocumentForSignature(_request: SignatureRequest): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
}

/** Puts the website's inbox back to its demo seed (used by "Reset demo data"). */
export function resetInbox(): Promise<unknown> {
  return call("", { method: "DELETE" });
}
