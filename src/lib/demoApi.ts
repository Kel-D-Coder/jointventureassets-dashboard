/**
 * Demo enquiries and contact messages, used while signed in with the demo
 * login (see DEMO_ADMIN in api.ts). The server has no endpoints for these
 * yet; listings, listing requests, requests and members always come from it.
 *
 * Every call waits a moment (like a network round trip) and then reads or
 * writes a small database kept in localStorage, so changes survive a reload.
 * Each group of functions has the same shape as its server version in api.ts.
 */
import { seedEnquiries } from "@/data/demoInbox";
import { seedMessages } from "@/data/seed";
import { readStored, removeStored, writeStored } from "@/lib/storage";
import type { ContactMessage, EnquiryStatus, InboxEnquiry } from "@/types";

const DB_KEY = "jva-admin-demo";

interface Db {
  messages: ContactMessage[];
  enquiries: InboxEnquiry[];
}

function freshDb(): Db {
  return structuredClone({ messages: seedMessages, enquiries: seedEnquiries });
}

function loadDb(): Db {
  const stored = readStored<Partial<Db> | null>(DB_KEY, null);
  // Fill in any collection added since this browser last saved.
  return stored ? { ...freshDb(), ...stored } : freshDb();
}

/** Waits 300–700 ms, then runs `work` against the database and saves any changes. */
async function simulate<T>(work: (db: Db) => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
  const db = loadDb();
  const result = work(db);
  writeStored(DB_KEY, db);
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

export const demoEnquiries = {
  list: () => simulate((db) => byNewest(db.enquiries)),
  get: (id: string) => simulate((db) => find(db.enquiries, id, "enquiry")),
  setStatus: (id: string, status: EnquiryStatus) =>
    simulate((db) => {
      const enquiry = find(db.enquiries, id, "enquiry");
      enquiry.status = status;
      return enquiry;
    }),
  remove: (id: string) =>
    simulate((db) => {
      db.enquiries = db.enquiries.filter((enquiry) => enquiry.id !== id);
    }),
};

export const demoMessages = {
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

/** In demo mode nothing is sent; this only waits like a request would. */
export const demoSend = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
