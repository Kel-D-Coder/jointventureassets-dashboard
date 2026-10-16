/**
 * A stand-in for the JVA backend while the dashboard is tested on its own.
 *
 * Every call waits a moment (like a network round trip) and then reads or
 * writes a small database kept in localStorage, so changes survive a reload.
 * The functions are shaped like the real endpoints they replace, so swapping
 * this file for real HTTP calls later only touches this file.
 */
import { addedSeedListingIds, seedListings } from "@/data/listings";
import { seedMessages, seedRequests } from "@/data/seed";
import { readStored, removeStored, writeStored } from "@/lib/storage";
import type {
  AdminSession,
  ContactMessage,
  Listing,
  PartnerRequest,
  RequestStatus,
} from "@/types";

const DB_KEY = "jva-admin-db";
export const SESSION_KEY = "jva-admin-session";

/** The demo admin login, shown on the sign-in page. */
export const DEMO_ADMIN = { email: "admin@jointventureassets.com", password: "admin123" };

interface Db {
  listings: Listing[];
  requests: PartnerRequest[];
  messages: ContactMessage[];
}

function freshDb(): Db {
  return structuredClone({
    listings: seedListings,
    requests: seedRequests,
    messages: seedMessages,
  });
}

function loadDb(): Db {
  const stored = readStored<Partial<Db> | null>(DB_KEY, null);
  // Fill in any collection added since this browser last saved.
  return stored ? withNewSeedFields({ ...freshDb(), ...stored }) : freshDb();
}

/** Copies JV premium / negotiable answers onto sample records saved before those fields existed. */
function withNewSeedFields(db: Db): Db {
  const listingSeeds = new Map(seedListings.map((listing) => [listing.id, listing]));
  for (const id of addedSeedListingIds) {
    if (!db.listings.some((listing) => listing.id === id)) db.listings.push(structuredClone(listingSeeds.get(id)!));
  }
  for (const listing of db.listings) {
    const seed = listingSeeds.get(listing.id);
    if (seed && listing.ownerEmail === undefined && listing.ownerName === seed.ownerName) {
      listing.ownerEmail = seed.ownerEmail;
      listing.ownerPhone = seed.ownerPhone;
    }
    if (seed?.closing && !listing.closing && listing.status === "closed") listing.closing = structuredClone(seed.closing);
  }
  for (const listing of db.listings) {
    const seed = listingSeeds.get(listing.id)?.jv;
    if (listing.jv && seed && listing.jv.sharingNegotiable === undefined && listing.jv.premium === undefined) {
      listing.jv = { ...listing.jv, sharingNegotiable: seed.sharingNegotiable, premium: seed.premium };
    }
  }
  const requestSeeds = new Map(seedRequests.map((request) => [request.id, request]));
  for (const request of db.requests) {
    const seed = requestSeeds.get(request.id);
    if (seed?.sharingFormula && request.sharingNegotiable === undefined && request.premium === undefined) {
      request.sharingNegotiable = seed.sharingNegotiable;
      request.premium = seed.premium;
    }
  }
  return db;
}

/** Waits 300–700 ms, then runs `work` against the database and saves any changes. */
async function simulate<T>(work: (db: Db) => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
  const db = loadDb();
  const result = work(db);
  try {
    writeStored(DB_KEY, db);
  } catch {
    // Uploaded photos are kept in the browser, which only holds about 5 MB.
    throw new Error("The demo storage in this browser is full. Remove some uploaded photos, or use Reset demo data.");
  }
  // Hand back copies, so callers can't edit the "server" data by accident.
  return structuredClone(result);
}

function byNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function find<T extends { id: string }>(items: T[], id: string, what: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`That ${what} no longer exists.`);
  return item;
}

/** Puts every demo record back the way it started. */
export function resetDemoData(): void {
  removeStored(DB_KEY);
}

// --- Auth ------------------------------------------------------------------

export const auth = {
  login: (email: string, password: string) =>
    simulate<AdminSession>(() => {
      const matches =
        email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
      if (!matches) throw new Error("Wrong email or password.");
      return { name: "JVA Admin", email: DEMO_ADMIN.email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
    }),
};

// --- Requests --------------------------------------------------------------

export const requests = {
  list: () => simulate((db) => byNewest(db.requests)),

  get: (id: string) => simulate((db) => find(db.requests, id, "request")),

  review: (id: string, status: Exclude<RequestStatus, "pending">, note: string) =>
    simulate((db) => {
      const request = find(db.requests, id, "request");
      request.status = status;
      request.reviewNote = note.trim() || undefined;
      request.updatedAt = new Date().toISOString();
      return request;
    }),
};

// --- Listings --------------------------------------------------------------

export type ListingInput = Omit<Listing, "id" | "views" | "createdAt">;

export const listings = {
  list: () => simulate((db) => byNewest(db.listings)),

  get: (id: string) => simulate((db) => find(db.listings, id, "listing")),

  create: (input: ListingInput) =>
    simulate((db) => {
      const listing: Listing = {
        ...input,
        id: `lst-${Date.now().toString().slice(-6)}`,
        views: 0,
        createdAt: new Date().toISOString(),
      };
      db.listings.push(listing);
      return listing;
    }),

  update: (id: string, input: ListingInput) =>
    simulate((db) => {
      const listing = find(db.listings, id, "listing");
      Object.assign(listing, input);
      // A sale has no JV terms; drop any left over from before the switch.
      if (listing.dealType === "sale") delete listing.jv;
      return listing;
    }),

  remove: (id: string) =>
    simulate((db) => {
      find(db.listings, id, "listing");
      db.listings = db.listings.filter((listing) => listing.id !== id);
    }),
};

// --- Contact messages ------------------------------------------------------

export const messages = {
  list: () => simulate((db) => byNewest(db.messages)),

  get: (id: string) => simulate((db) => find(db.messages, id, "message")),

  setRead: (id: string, read: boolean) =>
    simulate((db) => {
      find(db.messages, id, "message").read = read;
    }),

  remove: (id: string) =>
    simulate((db) => {
      db.messages = db.messages.filter((message) => message.id !== id);
    }),
};
