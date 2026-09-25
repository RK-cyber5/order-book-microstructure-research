"use client";

import { Github } from "lucide-react";
import { GITHUB_URL } from "./site-constants";

const TOPICS = [
  "Market Microstructure",
  "Short-Horizon Predictability",
  "Generalization",
  "Execution",
];

const LINKS = [
  { label: "Research", href: "#overview" },
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "Methodology", href: "#methodology" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-hairline bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-ink font-mono text-[11px] font-semibold text-white"
              >
                OB
              </span>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
                Order Book Microstructure Lab
              </p>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-faint">
              Quantitative research on market microstructure, short-horizon predictability,
              cross-session generalization, and execution costs — built to be reproduced, not
              just published.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-faint">
              Links
            </p>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-body transition-colors hover:text-accent"
                  >
                    {link.label}
                    {link.external ? (
                      <span aria-hidden="true" className="text-faint">↗</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-faint">
              Research areas
            </p>
            <ul className="mt-4 space-y-2.5">
              {TOPICS.map((topic) => (
                <li key={topic} className="font-mono text-xs text-body">
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-hairline-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl font-mono text-[9.5px] leading-relaxed tracking-[0.08em] text-faint/80">
            Research implementation built on an open-source limit-order-book framework with
            attribution retained (upstream engine: mansoor-mamnoon/limit-order-book, MIT).
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint/70">
            <Github className="h-3 w-3" aria-hidden="true" />
            RK-cyber5 · order-book-microstructure-research
          </p>
        </div>
      </div>
    </footer>
  );
}
