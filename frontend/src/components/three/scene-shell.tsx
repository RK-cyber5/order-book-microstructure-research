"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SceneContextValue {
  reduced: boolean;
  mobile: boolean;
  visible: boolean;
  registerReset: (fn: () => void) => void;
}

interface SceneShellProps {
  /** Scene content rendered inside the R3F Canvas (receives scene context). */
  children: (ctx: SceneContextValue) => ReactNode;
  /** Small mono badge, top-right (e.g. "SIMULATED MICROSTRUCTURE VIEW"). */
  badge: string;
  /** Optional custom HUD overlay, top-left. */
  hud?: ReactNode;
  /** Interaction hint, bottom-left. */
  hint?: string;
  /** Static fallback for devices without WebGL. */
  fallback: ReactNode;
  /** Height classes for the stage, e.g. "h-[420px] lg:h-[560px]". */
  heightClass: string;
  camera?: { fov: number; position: [number, number, number] };
  className?: string;
  ariaLabel: string;
  /** Extra DOM overlaid on the stage (e.g. ladder panel). */
  overlay?: ReactNode;
}

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Forces a single render when the frameloop is demand-driven. */
function InvalidateOnce() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // Defer so the scene graph is committed first.
    const id = setTimeout(() => invalidate(), 0);
    return () => clearTimeout(id);
  }, [invalidate]);
  return null;
}

/**
 * Shared shell for every 3D stage:
 * - lazy-mounts the Canvas when scrolled near the viewport
 * - pauses the render loop when off-screen (frameloop gating)
 * - honors prefers-reduced-motion (single static render)
 * - graceful static fallback when WebGL is unavailable
 * - RESET VIEW control wired to the scene's camera controls
 */
export function SceneShell({
  children,
  badge,
  hud,
  hint = "DRAG TO ROTATE · SCROLL TO ZOOM",
  fallback,
  heightClass,
  camera = { fov: 40, position: [8.2, 5.6, 10.2] },
  className,
  ariaLabel,
  overlay,
}: SceneShellProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const reduced = useReducedMotion() ?? false;
  const [mobile, setMobile] = useState(false);
  const [resetFn, setResetFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWebglOk(webglSupported()));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            setVisible(true);
          } else {
            setVisible(false);
          }
        }
      },
      { rootMargin: "260px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const registerReset = useCallback((fn: () => void) => {
    setResetFn(() => fn);
  }, []);

  const active = visible && !reduced;

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline bg-[linear-gradient(180deg,#fbfcfe_0%,#f3f6fb_100%)]",
        heightClass,
        className,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Soft vignette grounding the scene */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-4 h-16 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(26,47,82,0.08),transparent_65%)] blur-md"
      />

      {webglOk === false ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">{fallback}</div>
      ) : mounted ? (
        <Canvas
          frameloop={active ? "always" : "never"}
          dpr={[1, mobile ? 1.5 : 1.75]}
          camera={camera}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <InvalidateOnce />
          {children({ reduced, mobile, visible, registerReset })}
        </Canvas>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Initializing scene
          </div>
        </div>
      )}

      {overlay}

      {/* HUD chrome */}
      {hud ? <div className="pointer-events-none absolute left-4 top-4 z-10">{hud}</div> : null}
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <span className="inline-flex items-center gap-1.5 rounded border border-hairline bg-white/75 px-2.5 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-faint backdrop-blur-sm">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-accent/60 bg-accent/25" />
          {badge}
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 font-mono text-[9.5px] uppercase tracking-[0.18em] text-faint/80">
        {hint}
      </div>
      {mounted && webglOk !== false ? (
        <button
          type="button"
          onClick={() => resetFn?.()}
          className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 rounded-md border border-hairline bg-white/80 px-2.5 py-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-body backdrop-blur-sm transition-all hover:border-ink/25 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset view
        </button>
      ) : null}
    </div>
  );
}
