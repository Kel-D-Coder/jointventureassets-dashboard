import type { DealClosing, SubmittedDocument } from "@/types";

/** Form values for a closed deal; amounts are digit strings and the date is a datetime-local value. */
export interface ClosingDraft {
  closedAt: string;
  name: string;
  email: string;
  phone: string;
  finalAmount: string;
  facilitationFee: string;
  notes: string;
  documents: SubmittedDocument[];
}

export type ClosingErrors = Partial<Record<"closedAt" | "finalAmount", string>>;

/** The facilitation fee JVA charges: 10% of the land value or sale price. */
export const FEE_RATE = 0.1;

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO -> "2026-10-16T14:30" in the browser's time zone, for a datetime-local input. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function closingDraft(closing?: DealClosing, amount = 0): ClosingDraft {
  return {
    closedAt: toLocalInput(closing?.closedAt ?? new Date().toISOString()),
    name: closing?.counterparty.name ?? "",
    email: closing?.counterparty.email ?? "",
    phone: closing?.counterparty.phone ?? "",
    finalAmount: String(closing?.finalAmount || amount || ""),
    facilitationFee: closing ? String(closing.facilitationFee || "") : amount ? String(Math.round(amount * FEE_RATE)) : "",
    notes: closing?.notes ?? "",
    documents: closing?.documents ?? [],
  };
}

export function toClosing(draft: ClosingDraft): DealClosing {
  const closedAt = new Date(draft.closedAt);
  return {
    closedAt: Number.isNaN(closedAt.getTime()) ? new Date().toISOString() : closedAt.toISOString(),
    counterparty: { name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() },
    finalAmount: Number(draft.finalAmount) || 0,
    facilitationFee: Number(draft.facilitationFee) || 0,
    documents: draft.documents,
    notes: draft.notes.trim(),
  };
}

export function closingErrors(draft: ClosingDraft): ClosingErrors {
  const errors: ClosingErrors = {};
  if (!draft.closedAt) errors.closedAt = "When did it close?";
  if (!(Number(draft.finalAmount) > 0)) errors.finalAmount = "Enter the agreed amount.";
  return errors;
}
