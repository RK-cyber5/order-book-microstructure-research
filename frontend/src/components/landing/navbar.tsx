"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Github, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GITHUB_URL, NAV_ITEMS } from "./site-constants";

const SECTION_IDS = NAV_ITEMS.map((item) => item.href.replace("#", ""));

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-38% 0px -56% 0px", threshold: 0 },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-hairline bg-white/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-white"
      >
        Skip to content
      </a>
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        {/* Brand */}
        <a href="#top" className="group flex items-center gap-3" aria-label="Order Book Microstructure Lab — home">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-ink/85 bg-ink font-mono text-[11px] font-semibold tracking-tight text-white transition-colors group-hover:bg-navy-700"
          >
            OB
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
              Order Book Microstructure Lab
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-faint">
              Quantitative Research
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href.replace("#", "");
            return (
              <a
                key={item.href}
                href={item.href}
                role="listitem"
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
                  isActive ? "text-ink" : "text-faint hover:text-ink",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-accent transition-all duration-300",
                    isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                  )}
                />
              </a>
            );
          })}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 flex items-center gap-2 rounded-md border border-hairline bg-white px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink transition-all hover:-translate-y-[1px] hover:border-ink/25 hover:shadow-sm"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            GitHub
            <span aria-hidden="true" className="text-faint">↗</span>
          </a>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View project on GitHub"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-white text-ink"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-white text-ink"
            >
              <Menu className="h-4.5 w-4.5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] border-hairline bg-white p-0">
              <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-ink font-mono text-[11px] font-semibold text-white"
                >
                  OB
                </span>
                <SheetTitle className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
                  Microstructure Lab
                </SheetTitle>
              </div>
              <nav className="flex flex-col px-3 py-4" aria-label="Mobile">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-3 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                      active === item.href.replace("#", "")
                        ? "bg-accent-soft text-accent-deep"
                        : "text-body hover:bg-panel",
                    )}
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 rounded-md px-3 py-3 font-mono text-xs uppercase tracking-[0.18em] text-ink"
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub ↗
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
