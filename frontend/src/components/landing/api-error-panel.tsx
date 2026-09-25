"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiErrorPanelProps {
  /** One-line explanation of what failed. */
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Compact, professional error state shown when the research API cannot be
 * reached. Never displays fake values — states clearly that live research
 * data is unavailable and offers a retry.
 */
export function ApiErrorPanel({
  message = "The research API did not respond, so live research values cannot be displayed. No placeholder data is shown.",
  onRetry,
  compact = false,
  className,
}: ApiErrorPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-hairline bg-white sm:flex-row sm:items-center sm:justify-between",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ask/30 bg-ask/10">
          <AlertTriangle className="h-3.5 w-3.5 text-ask" aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink">
            Research data unavailable
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-faint">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-hairline bg-white px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-all hover:-translate-y-[1px] hover:border-ink/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
