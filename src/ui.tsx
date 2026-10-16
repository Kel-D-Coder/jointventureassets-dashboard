import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { cx, withCommas } from "@/lib/format";

/** Shared input styling for every dashboard form. */
export const inputClass =
  "w-full rounded-lg border border-fg/15 bg-raised px-3.5 py-2.5 text-sm text-fg placeholder:text-ash focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:opacity-60";

export function PageHeader({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="label mb-2 text-gold-deep">{eyebrow}</p> : null}
        <h1 className="text-3xl text-fg sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-2 max-w-2xl text-sm text-muted">{intro}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-fg/8 bg-raised p-5 shadow-[0_1px_2px_rgb(14_17_22/0.04)] sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, hint, action }: { children: ReactNode; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg text-fg">{children}</h2>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cx(
        "block",
        error && "[&_input]:border-danger [&_select]:border-danger [&_textarea]:border-danger",
        className,
      )}
    >
      <span className="mb-1.5 block text-xs font-semibold text-fg">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: IconType;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="label text-muted">{label}</p>
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-deep">
            <Icon aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-4xl leading-none text-fg">{value}</p>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-fg/15 px-6 py-12 text-center">
      <p className="font-display text-xl text-fg">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Flat button for toolbars, table rows and form footers. */
export function Button({
  children,
  onClick,
  tone = "default",
  size = "sm",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger" | "solid" | "gold";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4.5 py-2.5 text-sm",
        tone === "default" && "border border-fg/15 bg-raised text-fg hover:border-fg/40",
        tone === "danger" && "border border-danger/30 bg-raised text-danger hover:bg-danger hover:text-white",
        tone === "solid" && "bg-ink text-white hover:bg-ink/85",
        tone === "gold" && "bg-gold text-ink hover:bg-gold/85",
      )}
    >
      {children}
    </button>
  );
}

const pillTones = {
  neutral: "bg-fg/6 text-muted",
  gold: "bg-gold-soft text-gold-deep",
  ink: "bg-ink text-white",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
} as const;

export type PillTone = keyof typeof pillTones;

/** Small status marker — a request's status, a listing's deal type. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", pillTones[tone])}>
      {children}
    </span>
  );
}

/** Segmented filter control: All / Joint venture / For sale. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-fg/10 bg-raised p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-ink text-white" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cx("rounded-full px-1.5 text-xs", active ? "bg-white/15" : "bg-fg/6")}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** A short-lived status line under a form or toolbar. */
export function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        tone === "success" ? "border-success/20 bg-success/8 text-success" : "border-danger/20 bg-danger/8 text-danger",
      )}
    >
      {children}
    </p>
  );
}

/** Rows of grey bars while a table loads. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-fg/8 bg-raised p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-fg/6" />
      ))}
    </div>
  );
}

/** The table frame every list page uses. */
export function Table({ head, children, minWidth = "min-w-3xl" }: { head: ReactNode; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-fg/8 bg-raised">
      <table className={cx("w-full text-left text-sm", minWidth)}>
        <thead className="border-b border-fg/8 bg-surface/60">
          <tr className="label text-muted [&>th]:px-5 [&>th]:py-3.5 [&>th]:font-bold">{head}</tr>
        </thead>
        <tbody className="divide-y divide-fg/8 [&_td]:px-5 [&_td]:py-3.5">{children}</tbody>
      </table>
    </div>
  );
}

/** A naira amount: shows commas as you type (1,000,000) and hands back digits only. */
export function MoneyInput({ value, onChange }: { value: string; onChange: (digits: string) => void }) {
  return (
    <input inputMode="numeric" value={withCommas(value)} onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))} className={inputClass} />
  );
}

export type YesNoValue = "" | "yes" | "no";

/** A yes/no question as two radio buttons. Not inside a Field: Field is a <label>. */
export function YesNo({
  name,
  legend,
  value,
  onChange,
  yes,
  no,
  error,
  className,
}: {
  name: string;
  legend: string;
  value: YesNoValue;
  onChange: (value: "yes" | "no") => void;
  yes: string;
  no: string;
  error?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 block text-xs font-semibold text-fg">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["yes", yes],
          ["no", no],
        ] as const).map(([option, label]) => (
          <label
            key={option}
            className={cx(
              "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-fg has-checked:border-gold has-checked:bg-gold-soft/50",
              error ? "border-danger" : "border-fg/15",
            )}
          >
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} className="accent-[#c9a24a]" />
            {label}
          </label>
        ))}
      </div>
      {error ? <span className="mt-1 block text-xs font-medium text-danger">{error}</span> : null}
    </fieldset>
  );
}
