"use client";

import { CountUp } from "./count-up";
import { Reveal } from "./reveal";
import { ApiErrorPanel } from "./api-error-panel";
import { useResearchSummary } from "@/hooks/use-research-data";
import { cn } from "@/lib/utils";

interface MetricCard {
  value?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  caption: string;
  highlight?: boolean;
}

export function MetricsStrip() {
  const { data: summary, isError, refetch } = useResearchSummary();

  const cards: MetricCard[] = [
    {
      value: summary?.total_l2_states,
      label: "L2 States",
      caption: "Reconstructed limit-order-book states across both sessions",
    },
    {
      value: summary?.sessions_count,
      label: "Trading Sessions",
      caption: "Chronologically independent BTCUSDT event windows",
    },
    {
      value: summary?.market_time_hours,
      decimals: 2,
      prefix: "~",
      suffix: " h",
      label: "Market Time",
      caption: "Development session plus unseen validation session, combined",
    },
    {
      value: summary?.unseen_l1_ic_at_10_events,
      decimals: 3,
      label: "Unseen L1 IC @ 10 Events",
      caption: "unseen Session 2 Spearman IC at 10-event horizon",
      highlight: true,
    },
  ];

  return (
    <section aria-label="Key project metrics" className="border-y border-hairline bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-faint">
            Verified project metrics
          </h2>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-faint/70">
            Source · generated research outputs, served via research API
          </p>
        </Reveal>

        {isError ? (
          <Reveal>
            <ApiErrorPanel
              message="The research API did not respond, so the verified project metrics cannot be displayed. No placeholder numbers are shown."
              onRetry={() => void refetch()}
            />
          </Reveal>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
            {cards.map((card, i) => (
              <Reveal
                key={card.label}
                delay={i * 0.08}
                className="min-w-[220px] snap-start sm:min-w-[240px] md:min-w-0"
              >
              <div
                className={cn(
                  "group h-full rounded-lg border bg-white p-5 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_14px_30px_-18px_rgba(10,27,51,0.28)]",
                  card.highlight
                    ? "border-accent/45 bg-accent-soft/25"
                    : "border-hairline hover:border-ink/20",
                )}
              >
                <p
                  className={cn(
                    "font-mono text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums sm:text-[34px]",
                    card.highlight ? "text-accent-deep" : "text-ink",
                  )}
                >
                  <CountUp
                    value={card.value}
                    decimals={card.decimals ?? 0}
                    prefix={card.prefix ?? ""}
                    suffix={card.suffix ?? ""}
                  />
                </p>
                <p className="mt-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-body">
                  {card.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-faint">{card.caption}</p>
              </div>
            </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={0.2} className="mt-5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint/70">
            The 0.143 figure is an information coefficient — not alpha, profitability, or proof of
            predictive edge.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
