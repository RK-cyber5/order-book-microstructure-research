"use client";

/**
 * Small shared display chips for the Signal Lab (result stats + history
 * comparison). Rendering helpers only — every value arrives from the API.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NaCell } from "./primitives";

/** Benjamini-Hochberg FDR outcome chip. */
export function FdrStatusChip({ status }: { status: boolean | null }) {
  if (status === null) {
    return <NaCell title="FDR status not published for this selection" />;
  }
  return (
    <span
      title={
        status
          ? "Benjamini-Hochberg FDR: this finding survives the multiple-testing correction across the 54 signal x horizon tests."
          : "Benjamini-Hochberg FDR: this finding does not survive the multiple-testing correction across the 54 signal x horizon tests."
      }
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em]",
        status
          ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
          : "border-hairline bg-panel text-faint",
      )}
    >
      {status ? "SURVIVED FDR" : "NOT SIGNIFICANT"}
    </span>
  );
}

/** Block-bootstrap IC confidence interval, or an explicit NaCell. */
export function CiRange({ low, high }: { low: number | null; high: number | null }) {
  if (low === null || high === null) {
    return <NaCell title="Confidence interval not published for this selection" />;
  }
  return (
    <span title={`95% CI (block bootstrap): [${low}, ${high}]`} className="tabular-nums">
      {`${fmt4(low)} – ${fmt4(high)}`}
    </span>
  );
}

function fmt4(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** Nullable numeric cell content (4 dp). */
export function Num4({ v, signed = false }: { v: number | null; signed?: boolean }) {
  if (v === null) return <NaCell />;
  return (
    <span className="tabular-nums">
      {signed && v > 0 ? "+" : ""}
      {fmt4(v)}
    </span>
  );
}

export type CompareRow = {
  label: string;
  a: ReactNode;
  b: ReactNode;
  same: boolean;
};
