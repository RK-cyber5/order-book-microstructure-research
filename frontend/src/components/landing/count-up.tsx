"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  value: number | undefined;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Rendered while the value is still loading from the research API. */
  placeholder?: string;
}

function format(value: number, decimals: number, prefix: string, suffix: string) {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

/**
 * Number count-up that starts when the element enters the viewport AND the
 * value has arrived from the research API. Jumps instantly for users who
 * prefer reduced motion.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 1500,
  prefix = "",
  suffix = "",
  className,
  placeholder = "—",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const ready = inView && typeof value === "number" && Number.isFinite(value);

  useEffect(() => {
    if (!ready) return;
    const target = value as number;

    if (reduce) {
      const id = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(id);
    }

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, value, duration, reduce]);

  const shown =
    display === null
      ? placeholder
      : format(display, decimals, prefix, suffix);

  return (
    <span ref={ref} className={className} aria-live="off">
      {shown}
    </span>
  );
}
