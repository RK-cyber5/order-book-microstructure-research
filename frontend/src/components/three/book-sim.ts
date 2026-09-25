"use client";

/**
 * Presentational limit-order-book simulator.
 *
 * This drives the hero's 3D order-book visualization, HUD readouts and the
 * L2 ladder. It is a SIMULATED MARKET VIEW for illustration only — the site
 * does not receive live market data, and none of these values are research
 * output.
 */

export const BOOK_GRID = {
  /** Time slices (event sequence axis). */
  T: 26,
  /** Price slots — indices 0..5 are bid levels (5 = best bid),
   *  6..11 are ask levels (6 = best ask). */
  P: 12,
} as const;

export interface BookSimState {
  event: number;
  mid: number;
  spreadBps: number;
  imbalance: number;
  microprice: number;
  bidPrices: number[];
  askPrices: number[];
  bidSizes: number[];
  askSizes: number[];
  timestamp: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const padEvent = (n: number) => String(n).padStart(8, "0");

let _seed = 42;
function seededRandom() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}

export class BookSim {
  /** Ring of recent depth frames, frames[0] = newest. Targets for the 3D scene. */
  frames: number[][] = [];
  private base: number[] = [];
  private level: number[] = [];
  private imb = 0.12;
  private midDrift = 0;
  private event = 74291;
  private spreadTicks = 2;
  private listeners = new Set<(s: BookSimState) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastDate = 1700000000000;

  constructor() {
    _seed = 42; // deterministic start
    for (let p = 0; p < BOOK_GRID.P; p++) {
      const dist = Math.abs(p - 5.5);
      this.base.push(Math.exp(-0.42 * (dist - 0.5)));
      this.level.push(this.base[p] * (0.7 + seededRandom() * 0.6));
    }
    for (let t = 0; t < BOOK_GRID.T; t++) {
      this.frames.push(this.level.map((v) => v * (0.85 + seededRandom() * 0.3)));
    }
  }

  subscribe(fn: (s: BookSimState) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 125);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    this.event += 1 + Math.floor(seededRandom() * 3);

    // Order-book imbalance: slow mean-reverting wander.
    this.imb = clamp(this.imb + (0 - this.imb) * 0.015 + (seededRandom() - 0.5) * 0.17, -0.72, 0.72);

    // Mid-price drift.
    this.midDrift = clamp(this.midDrift * 0.985 + (seededRandom() - 0.5) * 0.014, -0.06, 0.06);

    // Spread in ticks of 0.01.
    this.spreadTicks = clamp(
      Math.round(this.spreadTicks + (seededRandom() < 0.12 ? seededRandom() - 0.5 : 0)),
      1,
      4,
    );

    // Level depth evolution with imbalance tilt.
    for (let p = 0; p < BOOK_GRID.P; p++) {
      const tilt = p <= 5 ? 1 + 0.45 * this.imb : 1 - 0.45 * this.imb;
      const target = this.base[p] * tilt;
      this.level[p] = clamp(this.level[p] + (target - this.level[p]) * 0.22 + (seededRandom() - 0.5) * 0.06, 0.07, 1.7);
    }

    // Discrete liquidity events: additions, cancellations, executions.
    const r = seededRandom();
    if (r < 0.52) {
      // Executions land near the touch; the rest anywhere in the book.
      const nearTouch = seededRandom() < 0.45;
      const p = nearTouch
        ? seededRandom() < 0.5
          ? 5
          : 6
        : Math.floor(seededRandom() * BOOK_GRID.P);
      if (r < 0.26) {
        this.level[p] = Math.min(1.7, this.level[p] * 1.5); // limit order added
      } else if (r < 0.4) {
        this.level[p] = Math.max(0.06, this.level[p] * 0.5); // cancellation
      } else {
        this.level[p] = Math.max(0.05, this.level[p] * 0.72); // execution
      }
    }

    this.frames.unshift(this.level.slice());
    if (this.frames.length > BOOK_GRID.T) this.frames.pop();

    this.notify();
  }

  snapshot(): BookSimState {
    const mid = 102.38 + this.midDrift;
    const anchor = Math.round(mid * 100) / 100;
    const best = this.frames[0];
    const bidIdx = [5, 4, 3];
    const askIdx = [6, 7, 8];
    const bidSizes = bidIdx.map((i) => Math.round(best[i] * 640));
    const askSizes = askIdx.map((i) => Math.round(best[i] * 640));
    const bestBid = anchor - 0.01;
    const bestAsk = anchor + 0.01 + (this.spreadTicks - 2) * 0.01;
    const spreadBps = ((bestAsk - bestBid) / mid) * 10000;
    const bidVol = best[5];
    const askVol = best[6];
    const imbalance = (bidVol - askVol) / Math.max(1e-9, bidVol + askVol);
    const microprice = mid + (bestAsk - bestBid) * (imbalance / 2);
    this.lastDate += 123; // deterministic time increment
    const now = new Date(this.lastDate);
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(Math.floor(now.getMilliseconds() / 10)).padStart(2, "0")}`;

    return {
      event: this.event,
      mid,
      spreadBps,
      imbalance,
      microprice,
      bidPrices: bidIdx.map((i) => bestBid - (5 - i) * 0.01),
      askPrices: askIdx.map((i) => bestAsk + (i - 6) * 0.01),
      bidSizes,
      askSizes,
      timestamp,
    };
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}
