"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  index?: string;
  total?: string;
  align?: "left" | "center";
  className?: string;
  dark?: boolean;
}

/**
 * Consistent section header: mono eyebrow, large tight-tracked heading,
 * supporting lede, and an engineering-style section index (e.g. 02 / 08).
 */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  index,
  total = "08",
  align = "left",
  className,
  dark = false,
}: SectionHeaderProps) {
  return (
    <Reveal className={cn("relative", className)}>
      {index ? (
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 hidden font-mono text-[11px] tracking-[0.18em] sm:block",
            dark ? "text-slate-500" : "text-faint/70",
            align === "center" && "right-auto left-0",
          )}
          aria-hidden="true"
        >
          {index} / {total}
        </div>
      ) : null}
      <p
        className={cn(
          "font-mono text-[11px] font-medium uppercase tracking-[0.28em]",
          dark ? "text-[#7fa3d8]" : "text-accent",
          align === "center" && "text-center",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-4 text-balance text-3xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem]",
          dark ? "text-white" : "text-ink",
          align === "center" && "text-center",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed sm:text-base",
            dark ? "text-slate-300" : "text-body",
            align === "center" && "mx-auto text-center",
          )}
        >
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}
