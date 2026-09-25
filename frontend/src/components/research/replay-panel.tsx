"use client";

/**
 * REPLAY LAB — interactive reconstructed order-book exploration.
 *
 * PROVENANCE: raw event-level L2 data is not published with this repository.
 * Everything in this lab is a DETERMINISTIC RECONSTRUCTION served by the
 * research API (seeded, cached server-side, byte-identical on every request),
 * calibrated to the published research outputs. It is never presented as raw
 * exchange data or live market data. The event clock is derived event-time
 * (scaled from the published session duration), never wall-clock time.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { researchApi, type ReplayEvent } from "@/lib/research";
import { cn } from "@/lib/utils";
import {
  ChipToggle,
  NoteStrip,
  PanelShell,
  ProvenanceBadge,
  QueryState,
  StatCell,
  TerminalButton,
  fmt,
} from "./primitives";
import { EventTimeline } from "./event-timeline";
import type { SelectedLevel } from "./replay-book-3d";

const ReplayBook3D = dynamic(
  () => import("./replay-book-3d").then((m) => m.ReplayBook3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint sm:h-[400px] lg:h-[460px]">
        <span className="mr-3 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        LOADING RECONSTRUCTED BOOK SCENE…
      </div>
    ),
  },
);

const TRAILING = 48; // trailing events in the 3D scene (Z axis)
const BLOCK = 192; // events fetched per window request (≤ backend 400 cap)
const BLOCK_ALIGN = 96; // window block alignment
const SPEEDS = [0.5, 1, 2, 4] as const;
const BASE_EV_PER_SEC = 6;

export function ReplayPanel() {
  const [session, setSession] = useState(1);
  const [eventIndex, setEventIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [selected, setSelected] = useState<SelectedLevel | null>(null);
  const [jump, setJump] = useState("");

  /* ------------------------------------------------------ queries ---- */
  const timeline = useQuery({
    queryKey: ["research", "replay", "timeline", session],
    queryFn: () => researchApi.replayTimeline(session, 512),
    placeholderData: keepPreviousData,
  });

  const meta = timeline.data?.meta;
  const nEvents = meta?.replay_events ?? 2000;

  // Block-buffered window: always contains [eventIndex-47, eventIndex].
  const blockStart = Math.max(
    0,
    Math.floor((eventIndex - (TRAILING - 1)) / BLOCK_ALIGN) * BLOCK_ALIGN,
  );
  const blockEnd = Math.min(nEvents, blockStart + BLOCK);
  const window = useQuery({
    queryKey: ["research", "replay", "window", session, blockStart, blockEnd],
    queryFn: () => researchApi.replayWindow(session, blockStart, blockEnd),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  const winEvents = window.data?.events ?? [];
  const idxInWindow = eventIndex - (window.data?.from_index ?? 0);
  const inRange =
    window.data !== undefined &&
    idxInWindow >= 0 &&
    idxInWindow < (window.data?.events.length ?? 0);

  const visibleWindow = useMemo<ReplayEvent[]>(() => {
    if (!inRange || winEvents.length === 0) return [];
    const from = Math.max(0, idxInWindow - TRAILING + 1);
    return winEvents.slice(from, idxInWindow + 1);
  }, [inRange, winEvents, idxInWindow]);

  const current = visibleWindow[visibleWindow.length - 1] ?? null;

  /* ----------------------------------------------------- playback ---- */
  const atEnd = eventIndex >= nEvents - 1;
  const effectivePlaying = playing && !atEnd;

  useEffect(() => {
    if (!playing) return;
    const evPerSec = BASE_EV_PER_SEC * speed;
    const id = setInterval(() => {
      // Clamped at the end — React bails out on the unchanged value, so the
      // timer runs harmlessly until the user pauses or restarts.
      setEventIndex((prev) => Math.min(nEvents - 1, prev + 1));
    }, Math.max(16, 1000 / evPerSec));
    return () => clearInterval(id);
  }, [playing, speed, nEvents]);

  const togglePlay = useCallback(() => {
    if (atEnd && !playing) {
      // Replay from the start when Play is pressed at the end.
      setEventIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [atEnd, playing]);

  const step = useCallback(
    (delta: number) => {
      setPlaying(false);
      setEventIndex((prev) => Math.max(0, Math.min(nEvents - 1, prev + delta)));
    },
    [nEvents],
  );

  const seek = useCallback(
    (i: number) => {
      setPlaying(false);
      setEventIndex(Math.max(0, Math.min(nEvents - 1, i)));
    },
    [nEvents],
  );

  const applyJump = useCallback(() => {
    const v = Number.parseInt(jump, 10);
    if (Number.isFinite(v)) seek(v);
  }, [jump, seek]);

  const switchSession = useCallback(
    (s: number) => {
      setSession(s);
      setEventIndex(0);
      setPlaying(false);
      setSelected(null);
    },
    [],
  );

  /* ------------------------------------------------------- render ---- */
  const seed = window.data?.meta.seed ?? timeline.data?.meta.seed ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Provenance note — exact required wording. */}
      <NoteStrip tone="amber" icon="⚠">
        Raw event-level L2 data is not published with this repository. The
        visualization below is a deterministic reconstruction calibrated to the
        published research outputs.
      </NoteStrip>

      <PanelShell
        id="replay"
        title="Order Book Replay — Reconstructed"
        meta={`${meta?.label ?? "SESSION"} · ${fmt.int(nEvents)} REPLAY EVENTS · SEED ${seed} · 10 LEVELS / SIDE`}
        badge={<ProvenanceBadge kind="reconstructed" compact />}
      >
        {/* ---------------------------------------------- controls ---- */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-end gap-1.5">
            <ChipToggle
              label="Session 01 · Train"
              pressed={session === 1}
              onClick={() => switchSession(1)}
              title="Reconstructed series calibrated to Session 01 (train) statistics"
            />
            <ChipToggle
              label="Session 02 · Unseen"
              pressed={session === 2}
              onClick={() => switchSession(2)}
              title="Reconstructed series calibrated to Session 02 (unseen) statistics"
            />
          </div>

          <div className="flex min-w-[180px] flex-1 items-end gap-2 border border-hairline bg-white px-2 py-1.5">
            <span className="pb-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              Event
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, nEvents - 1)}
              value={eventIndex}
              aria-label="Event index"
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-hairline accent-accent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-hairline [&::-webkit-slider-thumb]:bg-ink"
            />
            <input
              type="number"
              value={jump}
              placeholder={String(eventIndex)}
              min={0}
              max={nEvents - 1}
              aria-label="Jump to event index"
              onChange={(e) => setJump(e.target.value)}
              onBlur={applyJump}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyJump();
              }}
              className="h-7 w-16 border border-hairline bg-panel px-1.5 text-right font-mono text-[10px] tabular-nums text-ink outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex items-end gap-1.5">
            <TerminalButton
              variant="secondary"
              onClick={() => step(-1)}
              title="Step back one event"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Step
            </TerminalButton>
            <TerminalButton
              onClick={togglePlay}
              title={
                atEnd && !playing
                  ? "Restart playback from the first event"
                  : effectivePlaying
                    ? "Pause playback"
                    : "Play event progression"
              }
              className="min-w-[86px]"
            >
              {effectivePlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {atEnd ? "Replay" : "Play"}
                </>
              )}
            </TerminalButton>
            <TerminalButton
              variant="secondary"
              onClick={() => step(1)}
              title="Step forward one event"
            >
              Step
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </TerminalButton>
          </div>

          <div className="flex items-end gap-1.5">
            {SPEEDS.map((s) => (
              <ChipToggle
                key={s}
                label={`${s}×`}
                pressed={speed === s}
                onClick={() => setSpeed(s)}
                title={`Playback speed — ${BASE_EV_PER_SEC * s} events per second`}
              />
            ))}
          </div>
        </div>

        {/* -------------------------------------- event counter row ---- */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border border-hairline bg-panel px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-body">
          <span className="tabular-nums text-ink">
            EVENT {String(eventIndex).padStart(4, "0")} / {fmt.int(nEvents)}
          </span>
          {current ? (
            <span className="tabular-nums">
              T+{fmt.dec(current.t_event_sec, 1)}s
              <span className="ml-1 text-faint">(derived event-time)</span>
            </span>
          ) : null}
          <span className="text-faint">
            DETERMINISTIC · NO WALL-CLOCK · NOT RAW EXCHANGE DATA
          </span>
          {inRange ? null : (
            <span className="ml-auto items-center gap-2 text-accent-deep">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              SYNCHRONIZING REPLAY WINDOW…
            </span>
          )}
        </div>

        {/* ------------------------------------------ main grid ---- */}
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(300px,340px)_1fr]">
          {/* Metrics + ladder (left) */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCell label="Mid" value={fmt.price(current?.mid ?? null)} />
              <StatCell
                label="Spread"
                value={fmt.dec(current?.spread_bps ?? null, 2)}
                unit="bps"
              />
              <StatCell
                label="L1 Imbalance"
                value={fmt.signed(current?.l1_imbalance ?? null, 3)}
                tone={current && current.l1_imbalance < 0 ? "ask" : "bid"}
              />
              <StatCell label="Microprice" value={fmt.price(current?.microprice ?? null)} />
              <StatCell label="OFI" value={fmt.signed(current?.ofi ?? null, 4)} />
              <StatCell
                label="Best Bid / Ask"
                value={
                  current ? (
                    <span className="flex justify-between gap-1 text-[10px]">
                      <span className="text-bid">{fmt.price(current.bids[0]?.price ?? null)}</span>
                      <span className="text-ask">{fmt.price(current.asks[0]?.price ?? null)}</span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>

            <BookLadder event={current} selected={selected} onSelect={setSelected} />
          </div>

          {/* 3D reconstructed book (right) */}
          <QueryState
            isLoading={window.isLoading && window.data === undefined}
            error={window.error}
            data={window.data}
            onRetry={() => window.refetch()}
            skeleton="LOADING RECONSTRUCTED BOOK…"
          >
            {() => (
              <ReplayBook3D
                window={visibleWindow}
                selected={selected}
                hud={
                  current ? (
                    <div className="rounded-md border border-hairline bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                      <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
                        Current event
                      </p>
                      <p className="mt-0.5 font-mono text-[9.5px] tabular-nums leading-relaxed text-ink">
                        EV {String(current.i).padStart(4, "0")} · MID {fmt.price(current.mid)} ·
                        SPREAD {fmt.dec(current.spread_bps, 1)} bps · L1 IMB{" "}
                        {fmt.signed(current.l1_imbalance, 2)}
                      </p>
                    </div>
                  ) : null
                }
              />
            )}
          </QueryState>
        </div>
      </PanelShell>

      {/* ------------------------------------------ event timeline ---- */}
      <PanelShell
        id="replay-timeline"
        title="Event-Time Timeline"
        meta="MID · SPREAD · L1 IMBALANCE · OFI"
        badge={<ProvenanceBadge kind="reconstructed" compact />}
      >
        <QueryState
          isLoading={timeline.isLoading && timeline.data === undefined}
          error={timeline.error}
          data={timeline.data}
          onRetry={() => timeline.refetch()}
          skeleton="LOADING TIMELINE…"
        >
          {(d) => (
            <EventTimeline
              points={d.points}
              nEvents={d.meta.replay_events}
              eventIndex={eventIndex}
              onSelect={seek}
            />
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Selecting an event on the timeline (or the slider above) updates the
          reconstructed order book, the 3D depth view and every displayed
          metric. Strided samples are served server-side; the browser never
          receives the full event series.
        </NoteStrip>
      </PanelShell>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2D depth ladder                                                     */
/* ------------------------------------------------------------------ */

function BookLadder({
  event,
  selected,
  onSelect,
}: {
  event: ReplayEvent | null;
  selected: SelectedLevel | null;
  onSelect: (s: SelectedLevel | null) => void;
}) {
  if (!event) {
    return (
      <div className="flex h-[380px] items-center justify-center border border-hairline bg-white font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        AWAITING RECONSTRUCTED BOOK…
      </div>
    );
  }

  const maxSize = Math.max(
    1e-6,
    ...event.bids.map((b) => b.size),
    ...event.asks.map((a) => a.size),
  );

  const Row = ({ side, k }: { side: "bid" | "ask"; k: number }) => {
    const level = side === "bid" ? event.bids[k] : event.asks[k];
    if (!level) return null;
    const pct = (level.size / maxSize) * 100;
    const isSel = selected?.side === side && selected?.k === k;
    const isTouch = k === 0;
    return (
      <button
        type="button"
        onClick={() => onSelect(isSel ? null : { side, k })}
        aria-pressed={isSel}
        title={`${side === "bid" ? "Bid" : "Ask"} level ${k + 1} — price ${fmt.price(level.price)}, size ${fmt.dec(level.size, 3)} (click to highlight in the 3D view)`}
        className={cn(
          "relative flex h-6 w-full items-center gap-2 border-b border-hairline-soft px-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent",
          side === "bid"
            ? isTouch
              ? "bg-bid/15"
              : "hover:bg-bid/10"
            : isTouch
              ? "bg-ask/15"
              : "hover:bg-ask/10",
          isSel && "ring-1 ring-inset ring-accent",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-[2px] left-0 rounded-r-sm",
            side === "bid" ? "bg-bid/30" : "bg-ask/30",
          )}
          style={{ width: `${pct}%` }}
        />
        <span
          className={cn(
            "relative z-10 w-7 shrink-0 font-mono text-[8px] tabular-nums text-faint",
          )}
        >
          {k + 1}
        </span>
        <span
          className={cn(
            "relative z-10 w-[86px] shrink-0 truncate font-mono text-[9.5px] tabular-nums",
            side === "bid" ? "text-bid" : "text-ask",
            isTouch && "font-bold",
          )}
        >
          {fmt.price(level.price)}
        </span>
        <span className="relative z-10 ml-auto truncate font-mono text-[9.5px] tabular-nums text-body">
          {fmt.dec(level.size, 3)}
        </span>
      </button>
    );
  };

  return (
    <div className="overflow-hidden border border-hairline bg-white" aria-label="Reconstructed order book depth ladder, ten levels per side">
      <div className="flex items-center justify-between border-b border-hairline bg-panel px-2 py-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-faint">
        <span>Depth Ladder · 10 × 10</span>
        <span>
          SIZES ∥ MAX {fmt.dec(maxSize, 2)} · CLICK A LEVEL TO SELECT
        </span>
      </div>
      {/* Asks (10 → 1) */}
      <div>
        {Array.from({ length: 10 }, (_, j) => 9 - j).map((k) => (
          <Row key={`a-${k}`} side="ask" k={k} />
        ))}
      </div>
      {/* Mid separator */}
      <div className="flex items-center justify-between border-y border-ink/20 bg-panel-2 px-1.5 py-1">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-faint">
          MID
        </span>
        <span className="font-mono text-[11px] font-bold tabular-nums text-ink">
          {fmt.price(event.mid)}
        </span>
        <span className="font-mono text-[9px] font-semibold tabular-nums text-faint">
          SPREAD {fmt.dec(event.spread, 2)}
        </span>
      </div>
      {/* Bids (1 → 10) */}
      <div>
        {Array.from({ length: 10 }, (_, k) => k).map((k) => (
          <Row key={`b-${k}`} side="bid" k={k} />
        ))}
      </div>
    </div>
  );
}
