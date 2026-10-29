import type { PaymentPlanDraft } from "@/data/labels";
import { Field, NumberInput, inputClass } from "@/ui";

/** An estate's payment plan: initial deposit, interest-free months, longest plan, notes. All optional. */
export function PaymentPlanFields({ value, onChange }: { value: PaymentPlanDraft; onChange: (next: PaymentPlanDraft) => void }) {
  const set = <K extends keyof PaymentPlanDraft>(key: K, next: PaymentPlanDraft[K]) => onChange({ ...value, [key]: next });
  return (
    <fieldset className="rounded-lg border border-fg/10 p-4">
      <legend className="px-1 text-xs font-semibold text-fg">Payment plan (optional)</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Initial deposit (₦)">
          <NumberInput value={value.initialDeposit} onChange={(digits) => set("initialDeposit", digits)} placeholder="e.g. 20,000,000" />
        </Field>
        <Field label="Interest-free (months)">
          <NumberInput value={value.interestFreeMonths} onChange={(digits) => set("interestFreeMonths", digits)} placeholder="e.g. 12" />
        </Field>
        <Field label="Longest plan (months)">
          <NumberInput value={value.maxMonths} onChange={(digits) => set("maxMonths", digits)} placeholder="e.g. 18" />
        </Field>
        <Field label="Notes" hint="Anything else buyers should know about paying." className="sm:col-span-3">
          <input value={value.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Installments are paid monthly" className={inputClass} />
        </Field>
      </div>
    </fieldset>
  );
}
