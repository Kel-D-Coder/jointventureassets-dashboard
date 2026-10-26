import { FaPlus, FaXmark } from "react-icons/fa6";
import { emptyPlotRow, priceNegotiableLabel, priceNegotiableOptions, type PlotRow } from "@/data/labels";
import { cx } from "@/lib/format";
import { NumberInput, inputClass } from "@/ui";
import type { PriceNegotiable } from "@/types";

/**
 * An estate's plot sizes, one row each: size, price, how negotiable, and an optional initial
 * deposit. Rows can be added and removed; at least one row always stays.
 */
export function PlotOptionsEditor({ rows, onChange, error }: { rows: PlotRow[]; onChange: (rows: PlotRow[]) => void; error?: string }) {
  const update = (index: number, changes: Partial<PlotRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  const remove = (index: number) => onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : [emptyPlotRow()]);

  return (
    <div>
      <div className="hidden grid-cols-[1fr_1.3fr_1.3fr_1.2fr_2rem] gap-2 px-1 pb-1.5 text-xs font-semibold text-fg sm:grid">
        <span>Plot size (sqm)</span>
        <span>Price (₦)</span>
        <span>Negotiable?</span>
        <span>Initial deposit (₦)</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="grid gap-2 rounded-lg border border-fg/10 p-2 sm:grid-cols-[1fr_1.3fr_1.3fr_1.2fr_2rem] sm:items-center sm:border-0 sm:p-0">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Plot size (sqm)</span>
              <NumberInput value={row.sizeSqm} onChange={(digits) => update(index, { sizeSqm: digits })} placeholder="e.g. 500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Price (₦)</span>
              <NumberInput value={row.price} onChange={(digits) => update(index, { price: digits })} placeholder="e.g. 30,000,000" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Negotiable?</span>
              <select
                value={row.priceNegotiable}
                onChange={(e) => update(index, { priceNegotiable: e.target.value as "" | PriceNegotiable })}
                className={cx(inputClass, !row.priceNegotiable && "text-muted")}
              >
                <option value="">Choose…</option>
                {priceNegotiableOptions.map((option) => (
                  <option key={option} value={option}>
                    {priceNegotiableLabel[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Initial deposit (₦), optional</span>
              <NumberInput value={row.deposit} onChange={(digits) => update(index, { deposit: digits })} placeholder="Optional" />
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove plot size ${index + 1}`}
              className="grid h-8 w-8 place-items-center justify-self-end rounded-md text-muted hover:bg-danger/10 hover:text-danger"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...rows, emptyPlotRow()])}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-fg/25 px-3 py-2 text-sm font-semibold text-muted hover:border-fg/50 hover:text-fg"
      >
        <FaPlus aria-hidden="true" className="h-3 w-3" /> Add a plot size
      </button>
      {error ? (
        <p className="mt-2 text-xs font-medium text-danger">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">The cheapest plot is used for sorting, and shows as &ldquo;From ₦…&rdquo; on the listing.</p>
      )}
    </div>
  );
}
