import { FaCheck } from "react-icons/fa6";
import { splitTitles, titleDocuments, toggleTitle } from "@/data/labels";
import { cx } from "@/lib/format";

/** Tick every title document the property has. Not inside a Field: Field is a <label>. */
export function TitleDocumentPicker({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const chosen = splitTitles(value);
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-fg">Title documents</legend>
      <div className="flex flex-wrap gap-2">
        {titleDocuments.map((title) => {
          const on = chosen.includes(title);
          return (
            <button
              key={title}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggleTitle(value, title))}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
                on ? "border-gold bg-gold-soft/60 text-fg" : "border-fg/15 bg-raised text-muted hover:border-fg/40 hover:text-fg",
              )}
            >
              {on ? <FaCheck aria-hidden="true" className="h-3 w-3 text-gold-deep" /> : null}
              {title}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">Pick all that apply.</p>
      )}
    </fieldset>
  );
}
