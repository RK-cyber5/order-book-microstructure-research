"use client";

/**
 * Research terminal design primitives.
 *
 * Shared visual contract for every /research panel. The target aesthetic is
 * an INSTITUTIONAL QUANT RESEARCH TERMINAL: dense information, technical
 * labels, small controls, hairline borders, precise mono typography — never
 * a marketing layout.
 *
 * Data-provenance rule (enforced by ProvenanceBadge):
 *   RESEARCH OUTPUT              — real published statistics
 *   RECONSTRUCTED — ILLUSTRATIVE — deterministic reconstruction (replay)
 *   MODELED EXECUTION            — modeled assumptions, not live trading
 *   ILLUSTRATIVE                 — synthetic visualization only
 */

import { type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ApiErrorPanel } from "@/components/landing/api-error-panel";

/* ------------------------------------------------------------------ */
/* Provenance labels — the two-tier data honesty system               */
/* ------------------------------------------------------------------ */

export type ProvenanceKind =
  | "research"
  | "reconstructed"
  | "modeled"
  | "illustrative";

const PROVENANCE_STYLE: Record<
  ProvenanceKind,
  { label: string; className: string; title: string }
> = {
  research: {
    label: "RESEARCH OUTPUT",
    className: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
    title: "Real published statistics, served verbatim from research outputs.",
  },
  reconstructed: {
    label: "RECONSTRUCTED — ILLUSTRATIVE",
    className: "border-amber-500/40 bg-amber-50 text-amber-800",
    title:
      "Deterministic reconstruction calibrated to published research outputs. Not raw exchange data.",
  },
  modeled: {
    label: "MODELED EXECUTION — NOT LIVE TRADING",
    className: "border-amber-500/40 bg-amber-50 text-amber-800",
    title:
      "Research visualization of modeled assumptions. No live trading, no profitability claim.",
  },
  illustrative: {
    label: "ILLUSTRATIVE",
    className: "border-amber-500/40 bg-amber-50 text-amber-800",
    title: "Illustrative visualization. Points are not research observations.",
  },
};

export function ProvenanceBadge({
  kind,
  compact = false,
  className,
}: {
  kind: ProvenanceKind;
  compact?: boolean;
  className?: string;
}) {
  const s = PROVENANCE_STYLE[kind];
  return (
    <span
      title={s.title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono font-semibold uppercase tracking-[0.14em]",
        compact ? "text-[8.5px]" : "text-[9px]",
        s.className,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-1 shrink-0 rounded-full",
          kind === "research" ? "bg-emerald-600" : "bg-amber-500",
        )}
      />
      <span className="truncate">{s.label}</span>
      <span className="sr-only">{s.title}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Micro typography                                                   */
/* ------------------------------------------------------------------ */

export function Micro({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-faint",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Panel shell                                                        */
/* ------------------------------------------------------------------ */

export function PanelShell({
  id,
  title,
  meta,
  badge,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={cn(
        "overflow-hidden rounded-md border border-hairline bg-white",
        className,
      )}
    >
      <header className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hairline bg-panel px-3 py-2">
        {id ? (
          <h2
            id={`${id}-heading`}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink"
          >
            {title}
          </h2>
        ) : (
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink">
            {title}
          </h2>
        )}
        {meta ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            {meta}
          </span>
        ) : null}
        {badge ? <span className="ml-auto">{badge}</span> : null}
      </header>
      <div className={cn("p-3 sm:p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stat cells                                                         */
/* ------------------------------------------------------------------ */

export function StatCell({
  label,
  value,
  unit,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone?: "default" | "bid" | "ask" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "bid"
      ? "text-bid"
      : tone === "ask"
        ? "text-ask"
        : tone === "accent"
          ? "text-accent"
          : "text-ink";
  return (
    <div
      title={hint}
      className={cn("min-w-0 border border-hairline bg-panel px-2.5 py-2", className)}
    >
      <div className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-mono text-[13px] font-semibold tabular-nums leading-tight",
          toneClass,
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[9px] font-medium uppercase tracking-wider text-faint">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact controls                                                   */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function TerminalSelect({
  label,
  value,
  options,
  onChange,
  hint,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hint?: string;
  className?: string;
}) {
  return (
    <label
      title={hint}
      className={cn(
        "relative flex min-w-0 flex-col gap-1 border border-hairline bg-white px-2 py-1.5",
        className,
      )}
    >
      <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
        {label}
      </span>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent pr-5 font-mono text-[11px] font-semibold tabular-nums text-ink outline-none focus-visible:text-accent"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 font-mono text-[9px] text-faint"
        >
          ▾
        </span>
      </div>
    </label>
  );
}

export function ChipToggle({
  label,
  pressed,
  onClick,
  disabled,
  title,
  className,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 min-w-0 whitespace-nowrap rounded-sm border px-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
        pressed
          ? "border-accent bg-accent-soft text-accent-deep"
          : "border-hairline bg-white text-faint hover:border-ink/25 hover:text-ink",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function TerminalButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "bg-ink text-white hover:-translate-y-[1px] hover:bg-navy-700",
        variant === "secondary" &&
          "border border-hairline bg-white text-ink hover:border-ink/30 hover:shadow-sm",
        variant === "ghost" &&
          "border border-transparent bg-transparent text-faint hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Note strips (provenance / disclaimers)                             */
/* ------------------------------------------------------------------ */

export function NoteStrip({
  children,
  tone = "neutral",
  icon = "◦",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "emerald";
  icon?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "border-l-2 px-3 py-2 font-mono text-[10px] leading-relaxed",
        tone === "neutral" && "border-hairline bg-panel text-body",
        tone === "amber" && "border-amber-400 bg-amber-50/70 text-amber-900",
        tone === "emerald" &&
          "border-emerald-500 bg-emerald-50/70 text-emerald-900",
        className,
      )}
    >
      <span aria-hidden="true" className="mr-1.5 text-faint">
        {icon}
      </span>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Dense table helpers                                                */
/* ------------------------------------------------------------------ */

export const tableCls = {
  table: "w-full border-collapse font-mono text-[10.5px] tabular-nums",
  th: "border-b border-hairline bg-panel px-2 py-1.5 text-left font-semibold uppercase tracking-[0.14em] text-faint",
  td: "border-b border-hairline-soft px-2 py-1.5 text-body",
  tdNum: "border-b border-hairline-soft px-2 py-1.5 text-right text-ink",
};

/* ------------------------------------------------------------------ */
/* Query state wrapper — uniform loading / error / data rendering     */
/* ------------------------------------------------------------------ */

export function QueryState<T>({
  isLoading,
  error,
  onRetry,
  skeleton,
  children,
  data,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
  data: T | undefined;
}) {
  if (isLoading && data === undefined) {
    return (
      <div className="flex items-center gap-3 px-1 py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        {skeleton ?? "LOADING RESEARCH OUTPUT…"}
      </div>
    );
  }
  if (error && data === undefined) {
    return (
      <ApiErrorPanel
        compact
        onRetry={onRetry}
        message="The research API did not respond, so live research values cannot be displayed. No placeholder data is shown."
      />
    );
  }
  if (data === undefined) return null;
  return <>{children(data)}</>;
}

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

export const fmt = {
  int: (v: number | null | undefined) =>
    v === null || v === undefined
      ? "—"
      : v.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  dec: (v: number | null | undefined, digits = 4) =>
    v === null || v === undefined
      ? "—"
      : v.toLocaleString("en-US", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }),
  bps: (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined ? "—" : fmt.dec(v, digits),
  price: (v: number | null | undefined) =>
    v === null || v === undefined
      ? "—"
      : v.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
  sci: (v: number | null | undefined) =>
    v === null || v === undefined
      ? "—"
      : Math.abs(v) !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e4)
        ? v.toExponential(2)
        : v.toLocaleString("en-US", { maximumFractionDigits: 4 }),
  signed: (v: number | null | undefined, digits = 4) =>
    v === null || v === undefined ? "—" : `${v >= 0 ? "+" : ""}${fmt.dec(v, digits)}`,
};

/** Nullable cell content with an explicit "not published" tooltip. */
export function NaCell({
  title = "Not published for this selection",
  children = "—",
}: {
  title?: string;
  children?: string;
}) {
  return (
    <span title={title} className="cursor-help">
      {children}
      <span className="sr-only"> — not published</span>
    </span>
  );
}
