import { useRef, useState } from "react";
import { FaFilePdf, FaPaperclip, FaXmark } from "react-icons/fa6";
import { MAX_DOCUMENT_MB, toDocument } from "@/lib/files";
import { formatNaira } from "@/lib/format";
import { Field, MoneyInput, inputClass } from "@/ui";
import { FEE_RATE, type ClosingDraft, type ClosingErrors } from "@/lib/closing";
import type { SubmittedDocument } from "@/types";

/** Shown on a listing marked "Closed": who it closed with, when, for how much, and the signed documents. */
export function DealClosingFields({
  value,
  onChange,
  errors,
  dealType,
  hideCounterparty = false,
  feeRate = FEE_RATE,
}: {
  value: ClosingDraft;
  onChange: (next: ClosingDraft) => void;
  errors: ClosingErrors;
  dealType: "jv" | "sale";
  /** True when the buyer is picked separately (e.g. from the members), so their name, email and phone aren't asked here. */
  hideCounterparty?: boolean;
  /** The fee rate for the suggestion (0.1 = 10%); an estate's own rate for its plot sales. */
  feeRate?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const set = <K extends keyof ClosingDraft>(key: K, next: ClosingDraft[K]) => onChange({ ...value, [key]: next });
  const suggestedFee = Math.round((Number(value.finalAmount) || 0) * feeRate);
  const feePercent = Math.round(feeRate * 10000) / 100;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem("");
    const added: SubmittedDocument[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await toDocument(file));
      } catch (caught) {
        setProblem((caught as Error).message);
      }
    }
    onChange({ ...value, documents: [...value.documents, ...added] });
    if (input.current) input.current.value = "";
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Closed on" error={errors.closedAt}>
        <input type="datetime-local" value={value.closedAt} onChange={(e) => set("closedAt", e.target.value)} className={inputClass} />
      </Field>
      <Field label={dealType === "jv" ? "Agreed land value (₦)" : "Final sale price (₦)"} error={errors.finalAmount}>
        <MoneyInput value={value.finalAmount} onChange={(digits) => set("finalAmount", digits)} />
      </Field>

      {hideCounterparty ? null : (
        <>
          <p className="label pt-2 text-muted sm:col-span-2">{dealType === "jv" ? "Developer / investor" : "Buyer"}</p>
          <Field label="Name">
            <input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Person or company" className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
          </Field>
        </>
      )}
      <Field label="Facilitation fee (₦)" hint={suggestedFee ? `${feePercent}% of the agreed amount is ${formatNaira(suggestedFee)}.` : `${feePercent}% of the agreed amount.`}>
        <MoneyInput value={value.facilitationFee} onChange={(digits) => set("facilitationFee", digits)} />
      </Field>

      <Field label="Notes" hint="Anything worth remembering: payment terms, conditions, follow-ups." className="sm:col-span-2">
        <textarea rows={3} value={value.notes} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
      </Field>

      <div className="sm:col-span-2">
        <p className="mb-1.5 text-xs font-semibold text-fg">Documents used</p>
        {value.documents.length ? (
          <ul className="mb-3 divide-y divide-fg/8 rounded-lg border border-fg/10">
            {value.documents.map((doc, index) => (
              <li key={doc.name + index} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <FaFilePdf aria-hidden="true" className={doc.type === "application/pdf" ? "shrink-0 text-danger" : "shrink-0 text-muted"} />
                <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => set("documents", value.documents.filter((_, i) => i !== index))}
                  aria-label={`Remove ${doc.name}`}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <FaXmark aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-fg/25 px-4 py-2.5 text-sm font-semibold text-muted hover:border-fg/50 hover:text-fg"
        >
          <FaPaperclip aria-hidden="true" /> Attach signed agreements, receipts…
        </button>
        <input ref={input} type="file" multiple hidden accept="application/pdf,image/*" onChange={(e) => void addFiles(e.target.files)} />
        <p className="mt-1.5 text-xs text-muted">PDF or image, up to {MAX_DOCUMENT_MB} MB each.</p>
        {problem ? <p className="mt-1 text-xs font-medium text-danger">{problem}</p> : null}
      </div>
    </div>
  );
}
