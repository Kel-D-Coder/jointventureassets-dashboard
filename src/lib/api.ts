/**
 * The JVA server (FastAPI, docs at https://jva-server-x6te.onrender.com/docs).
 *
 * The admin endpoints cover listings (including drafts and closed deals),
 * listing requests sent from the website, members' requests and members.
 * Sign-in and file uploads use the shared auth and upload endpoints.
 *
 * Contact messages come from /admin/messages, and enquiries sent from the
 * website (POST /enquiries) from /admin/enquiries.
 */
import { demoEnquiries, demoMessages, demoSend } from "@/lib/demoApi";
import { readStored, removeStored } from "@/lib/storage";
import { fileExtension, joinMedia, splitMedia } from "@/lib/videoWatermark";
import { readPlotOptions } from "@/data/labels";
import type {
  AdminSession,
  ContactMessage,
  EnquiryStatus,
  InboxEnquiry,
  Listing,
  ListingSubmission,
  MemberAccount,
  PartnerRequest,
  SubmissionStatus,
  SubmittedDocument,
  AccountStatus,
} from "@/types";

const BASE = ((import.meta.env.VITE_SERVER_URL as string | undefined) ?? "https://jva-server-x6te.onrender.com/api/v1").replace(/\/$/, "");
export const SESSION_KEY = "jva-admin-session";

/**
 * The demo admin login, shown on the sign-in page. It works without the server and shows the demo
 * enquiries and messages in demoApi.ts. Nothing is sent to the server while it's in use, so the
 * other pages say to sign in with a real admin account instead.
 */
export const DEMO_ADMIN = { email: "admin@jointventureassets.com", password: "admin123" };
const DEMO_TOKEN = "demo";
const DEMO_NO_SERVER = "You're signed in with the demo login, which only covers enquiries and messages. Sign in with your JVA admin account to load this from the server.";

/** True while signed in with the demo login: enquiries and messages then read and write the demo data. */
export function isDemoSession(): boolean {
  return token() === DEMO_TOKEN;
}

/** Calls `demo`'s version of each function in demo mode, and `server`'s otherwise. */
function demoAware<T extends object>(server: T, demo: T): T {
  const picked = {} as Record<string, unknown>;
  for (const key of Object.keys(server)) {
    picked[key] = (...args: unknown[]) => {
      const source = (isDemoSession() ? demo : server) as Record<string, (...args: unknown[]) => unknown>;
      return source[key](...args);
    };
  }
  return picked as T;
}

/** Render's free tier sleeps; the first request after a while can take most of a minute. */
const TIMEOUT_MS = 60_000;

function token(): string | undefined {
  return readStored<AdminSession | null>(SESSION_KEY, null)?.token;
}

async function call<T>(path: string, init: RequestInit = {}, { auth = true }: { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const bearer = auth ? token() : undefined;
  // The demo login has no server account: nothing is sent until a real admin signs in.
  if (bearer === DEMO_TOKEN) throw new Error(DEMO_NO_SERVER);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (caught) {
    throw new Error(
      caught instanceof DOMException && caught.name === "TimeoutError"
        ? "The server took too long to answer. It may be waking up; try again in a moment."
        : "Couldn't reach the server. Check your connection and try again.",
    );
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string; detail?: unknown };
  if (response.status === 401 && auth) {
    // Expired or revoked token: sign out so the next screen is the login page.
    removeStored(SESSION_KEY);
  }
  if (!response.ok) {
    throw new Error(body.message ?? (typeof body.detail === "string" ? body.detail : `The server returned an error (${response.status}).`));
  }
  return body as T;
}

// --- Auth ------------------------------------------------------------------

type LoginUser = { fullName?: string; name?: string; email?: string };

/** What POST /admin/login sends back. The token and the admin's details may sit at the top level or under `data`. */
interface LoginResponse {
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: LoginUser;
  admin?: LoginUser;
  data?: Omit<LoginResponse, "data">;
}

export const auth = {
  /** POST /admin/login: only admin accounts are let in; the server rejects anyone else. */
  login: async (email: string, password: string): Promise<AdminSession> => {
    if (email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
      return { name: "JVA Admin (demo)", email: DEMO_ADMIN.email, token: DEMO_TOKEN, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
    }
    const body = await call<LoginResponse>("/admin/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }, { auth: false });
    const reply = { ...body.data, ...body };
    const token = reply.token ?? reply.accessToken ?? reply.access_token;
    if (!token) throw new Error("The server signed you in but didn't send a session token. Try again.");
    const user = reply.user ?? reply.admin ?? {};
    return {
      name: user.fullName ?? user.name ?? "Admin",
      email: user.email ?? email.trim(),
      token,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };
  },
};

/** POST /upload: stores a file and returns its public URL. Data URLs from the editor are uploaded; URLs pass through. */
export async function uploadIfNeeded(url: string, name: string): Promise<string> {
  // data: URLs are photos from the editor; blob: URLs are prepared videos (see videoWatermark.ts).
  if (!url.startsWith("data:") && !url.startsWith("blob:")) return url;
  const blob = await (await fetch(url)).blob();
  const extension = fileExtension(blob.type);
  const form = new FormData();
  form.append("file", new File([blob], name.includes(".") ? name : `${name}.${extension}`, { type: blob.type }));
  const body = await call<{ url: string }>("/upload", { method: "POST", body: form });
  return body.url;
}

async function uploadDocuments(documents: SubmittedDocument[]): Promise<SubmittedDocument[]> {
  return Promise.all(documents.map(async (doc) => ({ ...doc, url: await uploadIfNeeded(doc.url, doc.name) })));
}

// --- Reading the server's replies -------------------------------------------

/** The server wraps records in a named field, e.g. `{ status, listings: [...] }`; a bare array is accepted too. */
function pickList<T>(body: unknown, ...keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[];
  const record = (body ?? {}) as Record<string, unknown>;
  for (const key of [...keys, "data", "items", "results"]) if (Array.isArray(record[key])) return record[key] as T[];
  return [];
}

/** The same for one record, e.g. `{ status, listing: {...} }`. */
function pickOne<T>(body: unknown, ...keys: string[]): T {
  const record = (body ?? {}) as Record<string, unknown>;
  for (const key of [...keys, "data"]) if (record[key] && typeof record[key] === "object") return record[key] as T;
  return body as T;
}

/** Mongo-style records carry `_id` instead of `id`. */
type WithId = { id?: string; _id?: string };
const idOf = (record: WithId) => record.id ?? record._id ?? "";

const byNewest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

const path = (id: string) => encodeURIComponent(id);

// --- Listing requests (/admin/listing-requests) -----------------------------

type ServerSubmission = ListingSubmission & WithId;

const toSubmission = (submission: ServerSubmission): ListingSubmission => ({
  ...submission,
  // Listing titles are always shown in capitals.
  listing: { ...submission.listing, title: (submission.listing?.title ?? "").toUpperCase(), plotOptions: readPlotOptions(submission.listing?.plotOptions) },
  id: idOf(submission),
  kind: "listing-submission",
  documents: submission.documents ?? [],
  reviewNote: submission.reviewNote ?? undefined,
  listingId: submission.listingId ?? undefined,
});

const serverListingSubmissions = {
  /** Everything people have sent for review. Drafts stay with the person writing them. */
  list: async (): Promise<ListingSubmission[]> => {
    const body = await call<unknown>("/admin/listing-requests");
    return byNewest(pickList<ServerSubmission>(body, "submissions", "listingRequests", "requests").map(toSubmission)).filter(
      (submission) => submission.status !== "draft",
    );
  },
  /** The server has no admin endpoint for one listing request, so it's found in the list. */
  get: async (id: string): Promise<ListingSubmission> => {
    const found = (await serverListingSubmissions.list()).find((submission) => submission.id === id);
    if (!found) throw new Error("That listing request no longer exists.");
    return found;
  },
  review: async (id: string, changes: { status?: SubmissionStatus; reviewNote?: string }): Promise<ListingSubmission> => {
    const body = await call<unknown>(`/admin/listing-requests/${path(id)}/status`, { method: "PATCH", body: JSON.stringify(changes) });
    return toSubmission(pickOne<ServerSubmission>(body, "submission", "listingRequest", "request"));
  },
  /** DELETE /listings/submit/{id}: deletes the listing request for good. If the server refuses, its message is shown. */
  remove: async (id: string): Promise<void> => {
    await call(`/listings/submit/${path(id)}`, { method: "DELETE" });
  },
};

// --- Listings (/admin/listings) ---------------------------------------------

export type ListingInput = Omit<Listing, "id" | "views" | "createdAt">;

type ServerListing = Partial<Listing> & WithId;

function toListing(listing: ServerListing): Listing {
  return {
    ...listing,
    id: idOf(listing),
    title: (listing.title ?? "").toUpperCase(),
    dealType: listing.dealType ?? "sale",
    propertyType: listing.propertyType ?? "land",
    area: listing.area ?? "",
    city: listing.city ?? "",
    state: listing.state ?? "",
    sizeSqm: Number(listing.sizeSqm) || 0,
    price: Number(listing.price) || 0,
    titleDocument: listing.titleDocument ?? "",
    description: listing.description ?? "",
    highlights: listing.highlights ?? [],
    ...splitMedia(joinMedia(listing.images, listing.videos)),
    supportedDocuments: listing.supportedDocuments ?? [],
    plotOptions: readPlotOptions(listing.plotOptions),
    userId: listing.userId ?? undefined,
    jv: listing.jv ?? undefined,
    ownerName: listing.ownerName ?? "",
    ownerEmail: listing.ownerEmail ?? undefined,
    ownerPhone: listing.ownerPhone ?? undefined,
    status: listing.status ?? "draft",
    featured: Boolean(listing.featured),
    verified: Boolean(listing.verified),
    views: Number(listing.views) || 0,
    sourceSubmissionId: listing.sourceSubmissionId ?? undefined,
    closing: listing.closing ?? undefined,
    createdAt: listing.createdAt ?? new Date().toISOString(),
  };
}

/** Photos, the video, title documents and closing documents picked in the editor are uploaded first; the server stores their URLs. */
async function toListingBody(input: ListingInput): Promise<ListingInput> {
  const media = splitMedia(joinMedia(input.images, input.videos));
  const images = await Promise.all(media.images.map((url, index) => uploadIfNeeded(url, `photo-${index + 1}`)));
  const videos = await Promise.all(media.videos.map((url) => uploadIfNeeded(url, "video")));
  const closing = input.closing ? { ...input.closing, documents: await uploadDocuments(input.closing.documents) } : undefined;
  const supportedDocuments = await uploadDocuments(input.supportedDocuments ?? []);
  return { ...input, images, videos, supportedDocuments, closing, jv: input.dealType === "jv" ? input.jv : undefined };
}

/** An approved listing request is live on the website; the dashboard shows it as a published listing with the request's id. */
function submissionToListing(submission: ServerSubmission): Listing {
  const { listing, contact } = submission;
  return toListing({
    supportedDocuments: submission.documents ?? [],
    ...listing,
    jv: listing.dealType === "jv" ? listing.jv : undefined,
    ownerName: listing.ownerName || contact?.fullName,
    ownerEmail: contact?.email,
    ownerPhone: contact?.phoneNumber,
    id: idOf(submission),
    status: "published",
    verified: true,
    sourceSubmissionId: idOf(submission),
    createdAt: submission.createdAt,
  });
}

/** True for a listing that is really an approved listing request (see submissionToListing). */
const fromRequest = (listing: Listing) => listing.sourceSubmissionId === listing.id;

const notEditable =
  "This listing came from a listing request, and the server doesn't let the admin edit those yet. You can still delete it.";

/**
 * GET /admin/listings sends the admin's own listings under `listings` and the approved
 * listing requests under `submissions`; both are live on the website.
 */
async function allListings(): Promise<Listing[]> {
  const body = await call<unknown>("/admin/listings");
  const own = pickList<ServerListing>(body, "listings").map(toListing);
  // A request already turned into one of the admin's listings appears once, as that listing.
  const linked = new Set(own.map((listing) => listing.sourceSubmissionId).filter(Boolean));
  const approved = pickList<ServerSubmission>(body, "submissions")
    .filter((submission) => submission.status === "approved" && !linked.has(idOf(submission)))
    .map(submissionToListing);
  return byNewest([...own, ...approved]);
}

const serverListings = {
  /** Every listing: published, under offer, closed and drafts, plus approved listing requests. */
  list: allListings,
  /** /admin/listings/{id} only knows the admin's own listings; approved listing requests are found in the list. */
  get: async (id: string): Promise<Listing> => {
    try {
      return toListing(pickOne<ServerListing>(await call<unknown>(`/admin/listings/${path(id)}`), "listing"));
    } catch (caught) {
      const found = (await allListings()).find((listing) => listing.id === id);
      if (found) return found;
      throw caught;
    }
  },
  create: async (input: ListingInput): Promise<Listing> => {
    const body = await call<unknown>("/admin/listings", { method: "POST", body: JSON.stringify(await toListingBody(input)) });
    return toListing(pickOne<ServerListing>(body, "listing"));
  },
  update: async (id: string, input: ListingInput): Promise<Listing> => {
    if (input.sourceSubmissionId === id) throw new Error(notEditable);
    const body = await call<unknown>(`/admin/listings/${path(id)}`, { method: "PUT", body: JSON.stringify(await toListingBody(input)) });
    return toListing(pickOne<ServerListing>(body, "listing"));
  },
  /** An approved listing request is deleted with DELETE /listings/submit/{id}; the admin's own listings with DELETE /admin/listings/{id}. */
  remove: async (id: string): Promise<void> => {
    const listing = (await allListings()).find((candidate) => candidate.id === id);
    if (listing && fromRequest(listing)) {
      await serverListingSubmissions.remove(id);
      return;
    }
    await call(`/admin/listings/${path(id)}`, { method: "DELETE" });
  },
};

// --- Listing viewers (/admin/listings/{id}/views) --------------------------

/** A signed-in member who viewed a listing. */
export interface ListingViewer {
  userId: string;
  name: string;
  email: string;
  role: string;
  /** How many times they opened it. */
  count: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
}

/** Who viewed a listing: the signed-in members, most recent first, plus the views from visitors who weren't signed in. */
export interface ListingViewers {
  members: ListingViewer[];
  anonymous: number;
  total: number;
}

type ServerViewer = Record<string, unknown>;
const text = (...values: unknown[]) => values.find((value): value is string => typeof value === "string" && value.length > 0) ?? "";
const count = (...values: unknown[]) => Number(values.find((value) => value !== undefined && value !== null)) || 0;

function toViewer(raw: ServerViewer): ListingViewer {
  const user = (raw.user ?? raw.member ?? {}) as ServerViewer;
  return {
    userId: text(raw.userId, raw.id, raw._id, user.id, user._id),
    name: text(raw.fullName, raw.name, user.fullName, user.name) || "Member",
    email: text(raw.email, user.email),
    role: text(raw.role, user.role),
    count: count(raw.count, raw.views, raw.viewCount, raw.times, 1),
    firstViewedAt: text(raw.firstViewedAt, raw.firstView, raw.firstSeenAt) || undefined,
    lastViewedAt: text(raw.lastViewedAt, raw.lastView, raw.lastSeenAt, raw.viewedAt) || undefined,
  };
}

/** GET /admin/listings/{id}/views. Works for admin listings and approved listing requests alike. */
export async function listingViewers(id: string): Promise<ListingViewers> {
  const body = (await call<unknown>(`/admin/listings/${path(id)}/views`)) as Record<string, unknown>;
  const data = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
  const members = pickList<ServerViewer>(data, "members", "viewers", "users").map(toViewer);
  const anonymous = count(data.anonymous, data.anonymousViews, data.anonymousCount, data.guests, data.guestViews);
  const total = count(data.total, data.totalViews, data.views) || members.reduce((sum, member) => sum + member.count, 0) + anonymous;
  return { members, anonymous, total };
}

// --- Members' requests (/admin/requests) ------------------------------------

/** The server's request shape (Mongo-style `_id`, money sometimes as text). */
type ServerRequest = Omit<PartnerRequest, "id" | "budget" | "premium"> & WithId & { budget: string | number; premium?: string | number | null };

function toRequest(request: ServerRequest): PartnerRequest {
  return {
    ...request,
    id: idOf(request),
    budget: Number(String(request.budget ?? "").replace(/[^\d.]/g, "")) || 0,
    premium: request.premium === undefined || request.premium === null ? undefined : Number(request.premium) || 0,
    reviewNote: request.reviewNote ?? undefined,
    documents: request.documents ?? [],
  };
}

const serverRequests = {
  list: async (): Promise<PartnerRequest[]> => byNewest(pickList<ServerRequest>(await call<unknown>("/admin/requests"), "requests").map(toRequest)),
  get: async (id: string): Promise<PartnerRequest> => toRequest(pickOne<ServerRequest>(await call<unknown>(`/admin/requests/${path(id)}`), "request")),
  review: async (id: string, status: "accepted" | "rejected", note: string): Promise<PartnerRequest> => {
    const body = await call<unknown>(`/admin/requests/${path(id)}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewNote: note.trim() || undefined }),
    });
    return toRequest(pickOne<ServerRequest>(body, "request"));
  },
  /** DELETE /admin/requests/{id}: removes a member's request for good. */
  remove: async (id: string): Promise<void> => {
    await call(`/admin/requests/${path(id)}`, { method: "DELETE" });
  },
};

// --- Members (/admin/users) -------------------------------------------------

type ServerUser = Omit<Partial<MemberAccount>, "status"> & WithId & { status?: string | null };

const ACCOUNT_STATUSES: ReadonlyArray<AccountStatus> = ["pending", "active", "suspended"];

/**
 * The server's account status is "pending", "active" or "suspended". Anything
 * else (or nothing) is treated as "pending", so an unexpected value can never
 * show a member as approved.
 */
function toAccountStatus(status: string | null | undefined): AccountStatus {
  return ACCOUNT_STATUSES.find((known) => known === status) ?? "pending";
}

function toAccount(user: ServerUser): MemberAccount {
  const createdAt = user.createdAt ?? new Date().toISOString();
  return {
    ...user,
    id: idOf(user),
    kind: "account",
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    role: user.role ?? "Buyer",
    category: user.category ?? "",
    phoneNumber: user.phoneNumber ?? "",
    profile: user.profile ?? {},
    documents: user.documents ?? {},
    // A true/false boolean on the server; only a real true counts.
    profileCompleted: user.profileCompleted === true,
    status: toAccountStatus(user.status),
    createdAt,
    updatedAt: user.updatedAt ?? createdAt,
    lastActiveAt: user.lastActiveAt ?? user.updatedAt ?? createdAt,
  };
}

const serverAccounts = {
  /** Registered members. Admin accounts are left out. */
  list: async (): Promise<MemberAccount[]> => {
    const body = await call<unknown>("/admin/users");
    // TODO: remove once the response shape is confirmed.
    console.log("[GET /admin/users] response:", body);
    return byNewest(pickList<ServerUser>(body, "users", "accounts").map(toAccount)).filter((account) => account.role !== "Admin");
  },
  get: async (id: string): Promise<MemberAccount> => {
    const body = await call<unknown>(`/admin/users/${path(id)}`);
    console.log(`[GET /admin/users/${id}] response:`, body);
    return toAccount(pickOne<ServerUser>(body, "user", "account"));
  },
  setStatus: async (id: string, status: AccountStatus): Promise<MemberAccount> => {
    console.log(`[PATCH /admin/users/${id}/status] sending:`, { status });
    const body = await call<unknown>(`/admin/users/${path(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    console.log(`[PATCH /admin/users/${id}/status] response:`, body);
    return toAccount(pickOne<ServerUser>(body, "user", "account"));
  },
};

/** POST /admin/users/{id}/profile-reminder: emails a member who hasn't finished their profile. */
export async function sendProfileReminder(memberId: string): Promise<void> {
  await call(`/admin/users/${path(memberId)}/profile-reminder`, { method: "POST" });
}

// --- Enquiries (/admin/enquiries) -------------------------------------------

/**
 * The website sends { target, fullName, email, phoneNumber, message, jv?, sale? }
 * to POST /enquiries. The target may also come back as flat fields.
 */
type ServerEnquiry = Partial<Omit<InboxEnquiry, "target" | "status">> &
  WithId & {
    target?: Partial<InboxEnquiry["target"]>;
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
    listingId?: string;
    listingTitle?: string;
    requestId?: string;
    requestTitle?: string;
    emailAddress?: string;
    status?: string | null;
  };

const ENQUIRY_STATUSES: ReadonlyArray<EnquiryStatus> = ["new", "contacted", "closed"];

function toEnquiry(enquiry: ServerEnquiry): InboxEnquiry {
  const target = enquiry.target ?? {};
  const type = (target.type ?? enquiry.targetType ?? (enquiry.requestId ? "request" : "listing")) === "request" ? "request" : "listing";
  return {
    ...enquiry,
    id: idOf(enquiry),
    kind: "enquiry",
    target: {
      type,
      id: target.id ?? enquiry.targetId ?? (type === "request" ? enquiry.requestId : enquiry.listingId) ?? "",
      title: target.title ?? enquiry.targetTitle ?? (type === "request" ? enquiry.requestTitle : enquiry.listingTitle) ?? "Untitled",
      subtitle: target.subtitle ?? undefined,
      image: target.image ?? undefined,
    },
    fullName: enquiry.fullName ?? "",
    email: enquiry.email ?? enquiry.emailAddress ?? "",
    phoneNumber: enquiry.phoneNumber ?? "",
    message: enquiry.message ?? "",
    jv: enquiry.jv ?? undefined,
    sale: enquiry.sale ?? undefined,
    status: ENQUIRY_STATUSES.find((known) => known === enquiry.status) ?? "new",
    createdAt: enquiry.createdAt ?? new Date().toISOString(),
  };
}

const serverInboxEnquiries = {
  list: async (): Promise<InboxEnquiry[]> => byNewest(pickList<ServerEnquiry>(await call<unknown>("/admin/enquiries"), "enquiries").map(toEnquiry)),
  get: async (id: string): Promise<InboxEnquiry> => toEnquiry(pickOne<ServerEnquiry>(await call<unknown>(`/admin/enquiries/${path(id)}`), "enquiry")),
  setStatus: async (id: string, status: EnquiryStatus): Promise<InboxEnquiry> => {
    const body = await call<unknown>(`/admin/enquiries/${path(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    return toEnquiry(pickOne<ServerEnquiry>(body, "enquiry"));
  },
  remove: async (id: string): Promise<void> => {
    await call(`/admin/enquiries/${path(id)}`, { method: "DELETE" });
  },
};

// --- Contact messages (/admin/messages) -------------------------------------

/** The website's contact form sends the email as `emailAddress`; listing and request enquiries arrive here too. */
type ServerMessage = Partial<Omit<ContactMessage, "read">> & WithId & { emailAddress?: string; read?: boolean | null; isRead?: boolean | null };

function toMessage(message: ServerMessage): ContactMessage {
  return {
    id: idOf(message),
    fullName: message.fullName ?? "",
    email: message.email ?? message.emailAddress ?? "",
    phoneNumber: message.phoneNumber ?? "",
    consultationType: message.consultationType ?? "",
    subject: message.subject ?? "",
    message: message.message ?? "",
    read: Boolean(message.read ?? message.isRead),
    createdAt: message.createdAt ?? new Date().toISOString(),
  };
}

const serverMessages = {
  list: async (): Promise<ContactMessage[]> =>
    byNewest(pickList<ServerMessage>(await call<unknown>("/admin/messages"), "messages", "contacts").map(toMessage)),
  // The reply's `message` field is the record here, not a status sentence; pickOne only takes objects.
  get: async (id: string): Promise<ContactMessage> =>
    toMessage(pickOne<ServerMessage>(await call<unknown>(`/admin/messages/${path(id)}`), "message", "contactMessage", "contact")),
  setRead: async (id: string, read: boolean): Promise<void> => {
    await call(`/admin/messages/${path(id)}/read`, { method: "PATCH", body: JSON.stringify({ read }) });
  },
  remove: async (id: string): Promise<void> => {
    await call(`/admin/messages/${path(id)}`, { method: "DELETE" });
  },
};

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
 * Emails a filled document to a member to sign.
 * TODO(backend): replace with the real endpoint, e.g. POST /admin/documents/send-for-signature.
 */
export async function sendDocumentForSignature(_request: SignatureRequest): Promise<void> {
  if (isDemoSession()) return demoSend();
  throw new Error("The server doesn't have an endpoint for sending documents to sign yet.");
}

// --- Server or demo data ----------------------------------------------------

export const listingSubmissions = serverListingSubmissions;
export const listings = serverListings;
export const requests = serverRequests;
export const accounts = serverAccounts;
export const inboxEnquiries = demoAware(serverInboxEnquiries, demoEnquiries);
export const messages = demoAware(serverMessages, demoMessages);
