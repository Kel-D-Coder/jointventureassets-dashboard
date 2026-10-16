import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { cx, withCommas } from "@/lib/format";

/** Shared input styling for every dashboard form. */
export const inputClass =
  "w-full rounded-lg border border-fg/[0.13] bg-raised px-3 py-2 text-sm text-fg shadow-xs placeholder:text-ash focus:border-gold focus:ring-3 focus:ring-gold/20 focus:outline-none disabled:opacity-60";

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
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold text-gold-deep">{eyebrow}</p> : null}
        <h1 className="text-2xl text-fg sm:text-[1.75rem]">{title}</h1>
        {intro ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{intro}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-fg/[0.08] bg-raised p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, hint, action }: { children: ReactNode; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[0.9375rem] font-semibold tracking-normal text-fg">{children}</h2>
        {hint ? <p className="mt-0.5 text-[0.8125rem] text-muted">{hint}</p> : null}
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
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-fg">{label}</span>
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
        <p className="text-[0.8125rem] font-medium text-muted">{label}</p>
        {Icon ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold-soft/70 text-[0.8125rem] text-gold-deep">
            <Icon aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[1.75rem] leading-tight font-bold tracking-tight text-fg tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-fg/15 bg-raised/50 px-6 py-14 text-center">
      <p className="text-base font-semibold text-fg">{title}</p>
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
        size === "sm" ? "px-3 py-1.5 text-[0.8125rem]" : "px-4 py-2.5 text-sm",
        tone === "default" && "border border-fg/[0.13] bg-raised text-fg shadow-xs hover:bg-surface",
        tone === "danger" && "border border-danger/25 bg-raised text-danger shadow-xs hover:bg-danger hover:text-white",
        tone === "solid" && "bg-ink text-white shadow-xs hover:bg-ink/85",
        tone === "gold" && "bg-gold text-ink shadow-xs hover:bg-gold/85",
      )}
    >
      {children}
    </button>
  );
}

const pillTones = {
  neutral: "bg-fg/[0.05] text-muted ring-fg/10",
  gold: "bg-gold-soft/70 text-gold-deep ring-gold/30",
  ink: "bg-ink text-white ring-ink",
  success: "bg-success/[0.07] text-success ring-success/20",
  warning: "bg-warning/[0.07] text-warning ring-warning/20",
  danger: "bg-danger/[0.07] text-danger ring-danger/20",
  info: "bg-info/[0.07] text-info ring-info/20",
} as const;

export type PillTone = keyof typeof pillTones;

/** Small status marker — a request's status, a listing's deal type. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", pillTones[tone])}>
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
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg bg-fg/[0.05] p-1">
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
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
              active ? "bg-raised text-fg shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_1px_rgb(16_24_40/0.04)]" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cx("rounded-md px-1.5 text-[0.6875rem] tabular-nums", active ? "bg-gold-soft text-gold-deep" : "bg-fg/[0.06]")}>{option.count}</span>
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
        "rounded-lg border px-4 py-3 text-sm font-medium",
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
    <div className="space-y-3 rounded-xl border border-fg/[0.08] bg-raised p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-fg/6" />
      ))}
    </div>
  );
}

/** The table frame every list page uses. */
export function Table({ head, children, minWidth = "min-w-3xl" }: { head: ReactNode; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-fg/[0.08] bg-raised shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
      <table className={cx("w-full text-left text-sm", minWidth)}>
        <thead className="border-b border-fg/[0.08] bg-surface/70">
          <tr className="text-xs text-muted [&>th]:px-5 [&>th]:py-3 [&>th]:font-semibold">{head}</tr>
        </thead>
        <tbody className="divide-y divide-fg/[0.07] [&_td]:px-5 [&_td]:py-3.5 [&>tr]:transition-colors [&>tr:hover]:bg-surface/50">{children}</tbody>
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
      <legend className="mb-1.5 block text-[0.8125rem] font-medium text-fg">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["yes", yes],
          ["no", no],
        ] as const).map(([option, label]) => (
          <label
            key={option}
            className={cx(
              "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm text-fg shadow-xs has-checked:border-gold has-checked:bg-gold-soft/40",
              error ? "border-danger" : "border-fg/[0.13]",
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

/** A table row that opens `to` when clicked anywhere except a link or button inside it. Put a real <Link> in the first cell for keyboard users. */
export function RowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button, input, select")) return;
        navigate(to);
      }}
      className={cx("cursor-pointer", className)}
    >
      {children}
    </tr>
  );
}

/** "← All enquiries" at the top of a detail page. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
      <FaArrowLeft aria-hidden="true" /> {children}
    </Link>
  );
}
