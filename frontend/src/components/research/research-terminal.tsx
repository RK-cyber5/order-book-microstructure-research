"use client";

/**
 * /research — application root for the research terminal.
 *
 * A single route with a compact application navigation (URL ?view= state,
 * synced via history.replaceState so switching views never triggers a
 * document reload). Every panel is a client component that fetches its own
 * data from the research API; research statistics are never computed in
 * the browser.
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { researchApi } from "@/lib/research";
import { GITHUB_URL } from "@/components/landing/site-constants";
import { OverviewPanel } from "./overview-panel";
import { ReplayPanel } from "./replay-panel";
import { SignalsPanel } from "./signals-panel";
import { GeneralizationPanel } from "./generalization-panel";
import { ExecutionPanel } from "./execution-panel";
import { MethodologyPanel } from "./methodology-panel";

export const RESEARCH_VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "replay", label: "Replay" },
  { key: "signals", label: "Signals" },
  { key: "generalization", label: "Generalization" },
  { key: "execution", label: "Execution" },
  { key: "methodology", label: "Methodology" },
] as const;

export type ResearchView = (typeof RESEARCH_VIEWS)[number]["key"];

const VALID_VIEWS = new Set<string>(RESEARCH_VIEWS.map((v) => v.key));

function viewFromUrl(): ResearchView {
  if (typeof window === "undefined") return "overview";
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view") ?? "";
  return VALID_VIEWS.has(v) ? (v as ResearchView) : "overview";
}

/** Header dataset chip — live summary values from the research API. */
function DatasetChip() {
  const { data, isError } = useQuery({
    queryKey: ["research", "summary"],
    queryFn: researchApi.summary,
  });
  if (isError || !data) {
    return (
      <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-ask lg:inline">
        DATA · UNAVAILABLE
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-2 border-l border-hairline pl-3 font-mono text-[9px] uppercase tracking-[0.14em] text-faint lg:inline-flex">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bid" />
      {data.symbol} · {data.venue} · {data.total_l2_states.toLocaleString("en-US")}{" "}
      L2 STATES · {data.sessions_count} SESSIONS
    </span>
  );
}

export function ResearchTerminal() {
  // Default on both server and client (avoids hydration mismatch), then
  // reconcile with the URL after hydration — deferred to a pre-paint frame so
  // there is no visible flash and no synchronous setState-in-effect.
  const [view, setView] = useState<ResearchView>("overview");

  useEffect(() => {
    const urlView = viewFromUrl();
    if (urlView === view) return;
    const id = requestAnimationFrame(() => setView(urlView));
    return () => cancelAnimationFrame(id);
    // Mount-time reconciliation only (view is captured deliberately).
  }, [view]);

  const switchView = (next: ResearchView) => {
    setView(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        next === "overview" ? "/research" : `/research?view=${next}`,
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafbfd] text-ink antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-1.5 focus:font-mono focus:text-[10px] focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-4">
          <div className="flex h-12 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-hairline bg-white px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-faint transition-colors hover:border-ink/30 hover:text-ink"
              title="Back to landing page"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">SITE</span>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-ink font-mono text-[10px] font-bold text-white"
              >
                O
              </span>
              <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink">
                OBM LAB
                <span className="ml-2 hidden font-medium text-faint sm:inline">
                  RESEARCH TERMINAL
                </span>
              </span>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <DatasetChip />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-hairline bg-white px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-faint transition-colors hover:border-ink/30 hover:text-ink"
                title="View upstream source on GitHub"
              >
                <Github className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">SOURCE</span>
              </a>
            </div>
          </div>
          <nav
            aria-label="Research lab sections"
            className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1.5"
          >
            {RESEARCH_VIEWS.map((v) => {
              const active = v.key === view;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => switchView(v.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "h-7 shrink-0 whitespace-nowrap rounded-sm border px-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-hairline bg-white text-faint hover:border-ink/30 hover:text-ink",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-4 sm:px-4 sm:py-6">
        <PanelRouter view={view} onNavigate={switchView} />
      </main>

      <footer className="mt-auto border-t border-hairline bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint sm:px-4">
          <span className="text-body">
            ORDER BOOK MICROSTRUCTURE LAB — RESEARCH TERMINAL
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>RESEARCH &amp; IMPLEMENTATION BY ROHITH KUMAR</span>
            <span className="text-faint/80">
              MODELED / RECONSTRUCTED — NOT LIVE DATA
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-hairline underline-offset-2 transition-colors hover:text-ink"
            >
              UPSTREAM REPOSITORY ↗
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function PanelRouter({ view, onNavigate }: { view: ResearchView; onNavigate: (v: ResearchView) => void }): ReactNode {
  switch (view) {
    case "replay":
      return <ReplayPanel />;
    case "signals":
      return <SignalsPanel />;
    case "generalization":
      return <GeneralizationPanel />;
    case "execution":
      return <ExecutionPanel />;
    case "methodology":
      return <MethodologyPanel />;
    default:
      return <OverviewPanel onNavigate={onNavigate} />;
  }
}
