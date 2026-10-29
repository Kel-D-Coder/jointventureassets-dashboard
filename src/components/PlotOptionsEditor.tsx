import { FaPlus, FaXmark } from "react-icons/fa6";
import { emptyPlotRow, priceNegotiableLabel, priceNegotiableOptions, type EstateKind, type PlotRow } from "@/data/labels";
import { cx } from "@/lib/format";
import { NumberInput, inputClass } from "@/ui";
import type { PriceNegotiable } from "@/types";

/**
 * An estate's options, one row each. Plots: size, price, how negotiable, optional initial deposit.
 * Houses / apartments: unit type, price, how negotiable, optional size and initial deposit.
 * Rows can be added and removed; at least one row always stays.
 */
export function PlotOptionsEditor({
  rows,
  onChange,
  error,
  kind = "plots",
}: {
  rows: PlotRow[];
  onChange: (rows: PlotRow[]) => void;
  error?: string;
  kind?: EstateKind;
}) {
  const units = kind === "units";
  const update = (index: number, changes: Partial<PlotRow>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  const remove = (index: number) => onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : [emptyPlotRow()]);
  const columns = units ? "sm:grid-cols-[1.6fr_1.2fr_1.2fr_0.8fr_1fr_2rem]" : "sm:grid-cols-[1fr_1.3fr_1.3fr_1.2fr_2rem]";

  const sizeField = (row: PlotRow, index: number) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">{units ? "Size (sqm), optional" : "Plot size (sqm)"}</span>
      <NumberInput value={row.sizeSqm} onChange={(digits) => update(index, { sizeSqm: digits })} placeholder={units ? "Optional" : "e.g. 500"} />
    </label>
  );

  return (
    <div>
      <div className={cx("hidden gap-2 px-1 pb-1.5 text-xs font-semibold text-fg sm:grid", columns)}>
        {units ? <span>Unit type</span> : <span>Plot size (sqm)</span>}
        <span>Price (₦)</span>
        <span>Negotiable?</span>
        {units ? <span>Size (sqm)</span> : null}
        <span>Initial deposit (₦)</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className={cx("grid gap-2 rounded-lg border border-fg/10 p-2 sm:items-center sm:border-0 sm:p-0", columns)}>
            {units ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Unit type</span>
                <input value={row.label} onChange={(e) => update(index, { label: e.target.value })} placeholder="e.g. 2 Bedroom Apartment + BQ" className={inputClass} />
              </label>
            ) : (
              sizeField(row, index)
            )}
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
            {units ? sizeField(row, index) : null}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-fg sm:sr-only">Initial deposit (₦), optional</span>
              <NumberInput value={row.deposit} onChange={(digits) => update(index, { deposit: digits })} placeholder="Optional" />
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={units ? `Remove unit type ${index + 1}` : `Remove plot size ${index + 1}`}
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
        <FaPlus aria-hidden="true" className="h-3 w-3" /> {units ? "Add a unit type" : "Add a plot size"}
      </button>
      {error ? (
        <p className="mt-2 text-xs font-medium text-danger">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          The cheapest {units ? "unit" : "plot"} is used for sorting, and shows as &ldquo;From ₦…&rdquo; on the listing.
        </p>
      )}
    </div>
  );
}
