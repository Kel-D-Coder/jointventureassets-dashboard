import { useState } from "react";
import { Link } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { DealClosingFields } from "@/components/DealClosingFields";
import { OwnerPicker, type OwnerValue } from "@/components/OwnerPicker";
import { PersonLink } from "@/components/PersonLink";
import { closingDraft, closingErrors, toClosing, type ClosingDraft, type ClosingErrors } from "@/lib/closing";
import { formatDate, formatNaira, formatNairaShort, formatSize } from "@/lib/format";
import type { PlotSaleInput } from "@/lib/api";
import { Button, Card, CardTitle, DeleteButton, Field, Notice, inputClass } from "@/ui";
import type { PlotOption, PlotSale } from "@/types";

const noBuyer: OwnerValue = { userId: undefined, name: "", email: "", phone: "" };

/**
 * An estate's plot sales: each plot is recorded as it sells, with the usual closing details, while
 * the estate stays live. The buyer is picked from the platform's members, like a listing's owner,
 * or typed in. Each sale is saved to the server straight away (not with the listing) and shows on
 * the Closed deals page.
 */
export function PlotSalesCard({
  listingId,
  plots,
  sales,
  onRecord,
  onRemove,
  feeRate,
}: {
  listingId: string;
  /** The estate's facilitation fee rate (0.05 = 5%), for the suggested fee; the standard rate when missing. */
  feeRate?: number;
  /** The estate's plot sizes as currently entered. */
  plots: PlotOption[];
  sales: PlotSale[];
  /** Saves the sale; rejects with the server's message if it couldn't. */
  onRecord: (sale: PlotSaleInput) => Promise<void>;
  onRemove: (sale: PlotSale) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [plotSize, setPlotSize] = useState<number | null>(null);
  const [buyer, setBuyer] = useState<OwnerValue>(noBuyer);
  const [draft, setDraft] = useState<ClosingDraft>(() => closingDraft());
  const [errors, setErrors] = useState<ClosingErrors>({});
  const [plotError, setPlotError] = useState("");
  const [buyerError, setBuyerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  const total = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
  const fees = sales.reduce((sum, sale) => sum + sale.facilitationFee, 0);

  const choosePlot = (size: number | null) => {
    setPlotSize(size);
    setPlotError("");
    const plot = plots.find((option) => option.sizeSqm === size);
    // Start from that plot's price; the date and documents stay as entered.
    const fresh = closingDraft(undefined, plot?.price ?? 0);
    if (feeRate !== undefined && plot) fresh.facilitationFee = String(Math.round(plot.price * feeRate));
    setDraft((current) => ({ ...fresh, closedAt: current.closedAt, documents: current.documents, notes: current.notes }));
  };

  const close = () => {
    setRecording(false);
    setPlotSize(null);
    setBuyer(noBuyer);
    setDraft(closingDraft());
    setErrors({});
    setPlotError("");
    setBuyerError("");
    setProblem("");
  };

  const save = async () => {
    const problems = closingErrors(draft);
    setErrors(problems);
    setPlotError(plotSize === null ? "Choose which plot size was sold." : "");
    setBuyerError(buyer.name.trim() ? "" : "Choose the buyer from the members, or enter their name.");
    if (plotSize === null || !buyer.name.trim() || Object.keys(problems).length) return;
    const closing = toClosing({ ...draft, name: buyer.name, email: buyer.email, phone: buyer.phone });
    setSaving(true);
    setProblem("");
    try {
      await onRecord({ ...closing, plotSizeSqm: plotSize, buyerUserId: buyer.userId });
      close();
    } catch (caught) {
      setProblem((caught as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sale: PlotSale) => {
    setProblem("");
    try {
      await onRemove(sale);
    } catch (caught) {
      setProblem((caught as Error).message);
    }
  };

  return (
    <Card>
      <CardTitle hint="Record each plot as it sells. The estate stays live, and each sale shows on Closed deals.">Plot sales</CardTitle>

      {sales.length ? (
        <>
          <p className="mb-3 text-sm text-muted">
            <strong className="text-fg">{sales.length}</strong> {sales.length === 1 ? "plot" : "plots"} sold · {formatNairaShort(total)} · fees {formatNairaShort(fees)}
          </p>
          <ul className="mb-4 divide-y divide-fg/8 rounded-lg border border-fg/10">
            {[...sales]
              .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
              .map((sale) => (
                <li key={sale.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 text-sm">
                  <Link to={`/closed-deals/${listingId}/sales/${sale.id}`} className="font-semibold text-fg hover:underline">
                    {formatSize(sale.plotSizeSqm)} plot
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {sale.counterparty.name ? (
                      <PersonLink name={sale.counterparty.name} email={sale.counterparty.email} className="font-medium text-fg" />
                    ) : (
                      "Buyer not named"
                    )}{" "}
                    · {formatDate(sale.closedAt)}
                  </span>
                  <span className="font-semibold text-fg tabular-nums">{formatNaira(sale.finalAmount)}</span>
                  <DeleteButton label="Remove" onConfirm={() => remove(sale)} />
                </li>
              ))}
          </ul>
        </>
      ) : (
        <p className="mb-4 text-sm text-muted">No plots sold yet.</p>
      )}

      {problem ? (
        <div className="mb-4">
          <Notice tone="error">{problem}</Notice>
        </div>
      ) : null}

      {recording ? (
        <div className="space-y-4 rounded-lg border border-gold/30 bg-gold-soft/20 p-4">
          <Field label="Plot size sold" error={plotError}>
            <select value={plotSize ?? ""} onChange={(e) => choosePlot(e.target.value === "" ? null : Number(e.target.value))} className={inputClass}>
              <option value="">Choose a plot size</option>
              {plots.map((option) => (
                <option key={option.sizeSqm} value={option.sizeSqm}>
                  {formatSize(option.sizeSqm)}: {formatNaira(option.price)}
                </option>
              ))}
            </select>
          </Field>

          <fieldset>
            <legend className="text-xs font-semibold text-fg">Buyer</legend>
            <OwnerPicker
              role="buyer"
              value={buyer}
              onChange={(next) => {
                setBuyer(next);
                setBuyerError("");
              }}
              error={buyerError}
            />
          </fieldset>

          <DealClosingFields value={draft} onChange={setDraft} errors={errors} dealType="sale" hideCounterparty feeRate={feeRate} />
          <div className="flex flex-wrap gap-2">
            <Button tone="gold" size="md" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save sale"}
            </Button>
            <Button size="md" onClick={close} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : plots.length ? (
        <Button size="md" onClick={() => setRecording(true)}>
          <FaPlus aria-hidden="true" /> Record a plot sale
        </Button>
      ) : (
        <p className="text-xs text-muted">Add the plot sizes above first.</p>
      )}
    </Card>
  );
}
