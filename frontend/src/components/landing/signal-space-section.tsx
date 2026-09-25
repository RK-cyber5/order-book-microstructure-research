"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { ApiErrorPanel } from "./api-error-panel";
import { useSignalSpace } from "@/hooks/use-research-data";
import { cn } from "@/lib/utils";
import type { HoverInfo, SpaceFeature } from "@/components/three/signal-space-stage";

const SignalSpaceStage = dynamic(
  () => import("@/components/three/signal-space-stage").then((m) => m.SignalSpaceStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-hairline bg-panel sm:h-[480px] lg:h-[520px]">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Loading signal space
        </div>
      </div>
    ),
  },
);

const FEATURE_CHIPS: { key: SpaceFeature; label: string; color: string }[] = [
  { key: "l1", label: "L1 Imbalance", color: "#1d5be6" },
  { key: "l5", label: "L5 Imbalance", color: "#0e9f8e" },
  { key: "microprice", label: "Microprice", color: "#64748b" },
  { key: "ofi", label: "OFI", color: "#b45309" },
];

export function SignalSpaceSection() {
  const { data, isLoading, isError, refetch } = useSignalSpace();
  const [feature, setFeature] = useState<SpaceFeature>("l1");
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const points = data?.points ?? [];

  return (
    <section aria-labelledby="signal-space-heading" className="border-t border-hairline bg-panel/50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="04"
          eyebrow="3D Exploration"
          title="Signal Space"
          lede="Each point is one book event. The horizontal axis maps the selected microstructure feature, the vertical axis microprice deviation, and depth maps the future return. Rotate the space to inspect how book state relates to what happens next."
        />

        <Reveal delay={0.08} className="mt-10">
          {/* Feature toggle */}
          <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Select feature for the X axis">
            <span className="mr-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.2em] text-faint">
              X-axis feature
            </span>
            {FEATURE_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFeature(chip.key)}
                aria-pressed={feature === chip.key}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-all",
                  feature === chip.key
                    ? "border-ink/30 bg-ink text-white shadow-sm"
                    : "border-hairline bg-white text-body hover:border-ink/20 hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: chip.color, opacity: feature === chip.key ? 1 : 0.7 }}
                />
                {chip.label}
              </button>
            ))}
          </div>

          {isError ? (
            <div className="flex h-[420px] items-center justify-center px-4 sm:h-[480px] lg:h-[520px]">
              <ApiErrorPanel
                className="w-full max-w-xl"
                message="The illustrative signal-space point field could not be loaded from the research API. No synthetic substitute is rendered."
                onRetry={() => void refetch()}
              />
            </div>
          ) : isLoading ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-hairline bg-white sm:h-[480px] lg:h-[520px]">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Fetching illustrative point field
              </div>
            </div>
          ) : (
            <SignalSpaceStage points={points} feature={feature} hover={hover} onHover={setHover} />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">
              {data?.note ??
                "Illustrative point field generated deterministically (seed 42) — not research output."}
            </p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint/70">
              {data ? `${data.n_points.toLocaleString("en-US")} observations` : "—"}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
