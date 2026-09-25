"use client";



/**
 * Reconstructed order book — 3D scene.
 *
 * AXES: X = price level (bid levels ← mid → ask levels), Y = depth (size),
 * Z = event progression (trailing reconstructed events, newest at front).
 * Bid/ask depth, the mid plane (X=0), the current spread bracket and the
 * selected level are all rendered. Data arrives from the research API
 * (deterministic reconstruction) — nothing is generated in the browser.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { ReplayEvent } from "@/lib/research";
import { SceneShell, type SceneContextValue } from "@/components/three/scene-shell";

const BID_COLOR = new THREE.Color("#0e9f6e");
const ASK_COLOR = new THREE.Color("#e05252");
const MAX_INSTANCES = 48 * 20; // trailing events x (10 bid + 10 ask levels)
const LEVEL_W = 0.55; // X spacing per level
const Z_STEP = 0.17; // Z spacing per event
const MAX_H = 2.1; // max bar height

/** X slot of level k (0 = best) on the given side. */
const levelX = (side: "bid" | "ask", k: number) =>
  side === "bid" ? -(k + 1) * LEVEL_W : (k + 1) * LEVEL_W;

interface SceneProps {
  window: ReplayEvent[];
  selected: { side: "bid" | "ask"; k: number } | null;
  registerReset: (fn: () => void) => void;
}

function ReplayBookScene({ window: events, selected, registerReset }: SceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const n = events.length;
  const newestZ = (n - 1) * Z_STEP; // newest event at front (+Z)
  const zSpan = Math.max(1, n) * Z_STEP;

  const sizeMax = useMemo(
    () =>
      Math.max(
        1e-6,
        ...events.flatMap((e) => [
          ...e.bids.map((b) => b.size),
          ...e.asks.map((a) => a.size),
        ]),
      ),
    [events],
  );

  // Imperative instance placement — layout effect avoids identity-matrix flash.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let idx = 0;
    for (let t = 0; t < n; t++) {
      const e = events[t];
      // Older events fade toward a desaturated slate.
      const age = (n - 1 - t) / Math.max(1, n - 1); // 0 = newest
      const fade = 1 - 0.62 * age;
      for (let k = 0; k < 10; k++) {
        for (const side of ["bid", "ask"] as const) {
          const level = side === "bid" ? e.bids[k] : e.asks[k];
          if (!level) continue;
          const h = Math.max(0.02, (level.size / sizeMax) * MAX_H);
          dummy.position.set(levelX(side, k), h / 2, t * Z_STEP);
          dummy.scale.set(0.4, h, 0.13);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);
          tmpColor.copy(side === "bid" ? BID_COLOR : ASK_COLOR).multiplyScalar(fade);
          mesh.setColorAt(idx, tmpColor);
          idx++;
        }
      }
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [events, n, sizeMax, dummy, tmpColor]);

  // Selected-level marker follows the newest event's selected level.
  useLayoutEffect(() => {
    const g = markerRef.current;
    if (!g) return;
    const e = events[n - 1];
    if (!e || !selected) {
      g.visible = false;
      return;
    }
    const level = selected.side === "bid" ? e.bids[selected.k] : e.asks[selected.k];
    if (!level) {
      g.visible = false;
      return;
    }
    const h = Math.max(0.02, (level.size / sizeMax) * MAX_H);
    g.visible = true;
    g.position.set(levelX(selected.side, selected.k), h / 2, newestZ);
    g.scale.set(1, Math.max(0.08, h), 1);
  }, [events, n, selected, sizeMax, newestZ]);

  // RESET VIEW registration (SceneShell button).
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => controlsRef.current?.reset());
    });
  }, [registerReset]);

  const midZ = (zSpan - Z_STEP) / 2;

  return (
    <>
      <ambientLight intensity={0.92} />
      <directionalLight position={[6, 10, 6]} intensity={0.8} />

      {/* Mid-price plane — separates bid depth (X<0) from ask depth (X>0). */}
      <mesh position={[0, MAX_H / 2 + 0.15, midZ]}>
        <boxGeometry args={[0.035, MAX_H + 0.5, zSpan + 0.6]} />
        <meshBasicMaterial color="#16294d" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <Html position={[0, MAX_H + 0.75, midZ]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>MID · X=0</div>
      </Html>

      {/* Depth grid at the base. */}
      <Grid
        position={[0, 0.002, midZ]}
        args={[12.4, zSpan + 0.6]}
        cellSize={LEVEL_W}
        cellThickness={0.5}
        cellColor="#e0e7f1"
        sectionSize={LEVEL_W * 2}
        sectionThickness={1}
        sectionColor="#c2cfe0"
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Book depth instances. */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>

      {/* Current spread bracket — best bid / best ask of the newest event. */}
      {n > 0 ? (
        <>
          <mesh position={[-LEVEL_W, MAX_H + 0.32, newestZ]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="#1d5be6" />
          </mesh>
          <mesh position={[LEVEL_W, MAX_H + 0.32, newestZ]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="#1d5be6" />
          </mesh>
          <Html position={[0, MAX_H + 0.62, newestZ]} center zIndexRange={[0, 0]}>
            <div style={axisStyle()}>SPREAD · BEST BID / ASK</div>
          </Html>
        </>
      ) : null}

      {/* Selected level marker (outline box on the newest event). */}
      <group ref={markerRef} visible={false}>
        <mesh>
          <boxGeometry args={[0.52, 1, 0.22]} />
          <meshBasicMaterial color="#0a1b33" wireframe transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Axis labels. */}
      <Html position={[-5.6, MAX_H + 0.55, midZ]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>← BID LEVELS 1–10</div>
      </Html>
      <Html position={[5.6, MAX_H + 0.55, midZ]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>ASK LEVELS 1–10 →</div>
      </Html>
      <Html position={[0, -0.55, -1.2]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Y · DEPTH (SIZE) ↑ · Z · EVENT PROGRESSION (RECONSTRUCTED) →</div>
      </Html>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, MAX_H * 0.35, midZ]}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={24}
      />
    </>
  );
}

function axisStyle(): React.CSSProperties {
  return {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "8.5px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#64748b",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
  };
}

function ReplayFallback() {
  return (
    <div className="max-w-xs rounded-md border border-hairline bg-white px-4 py-3 text-center">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
        3D VIEW UNAVAILABLE
      </p>
      <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
        WEBGL IS NOT SUPPORTED ON THIS DEVICE. THE SAME RECONSTRUCTED DEPTH IS
        AVAILABLE IN THE 2D LADDER AND EVENT TIMELINE.
      </p>
    </div>
  );
}

export interface SelectedLevel {
  side: "bid" | "ask";
  k: number;
}

export function ReplayBook3D({
  window: events,
  selected,
  hud,
}: {
  window: ReplayEvent[];
  selected: SelectedLevel | null;
  /** DOM HUD overlay (top-left): current event readout. */
  hud?: React.ReactNode;
}) {
  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <ReplayBookScene window={events} selected={selected} registerReset={ctx.registerReset} />
    ),
    [events, selected],
  );

  return (
    <SceneShell
      badge="RECONSTRUCTED — ILLUSTRATIVE"
      hint="DRAG TO ROTATE · SCROLL TO ZOOM · RIGHT-DRAG TO PAN"
      heightClass="h-[320px] sm:h-[400px] lg:h-[460px]"
      camera={{ fov: 40, position: [8.6, 5.9, 10.6] }}
      fallback={<ReplayFallback />}
      ariaLabel="Reconstructed limit order book in three dimensions: price level on the horizontal axis, depth as height, event progression along the depth axis. Deterministic reconstruction calibrated to published research outputs."
      overlay={
        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[240px]">
          {hud}
          <div className="mt-1.5 rounded-md border border-hairline bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
            <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              Axes
            </p>
            <ul className="mt-1 space-y-[2px] font-mono text-[9px] leading-none text-body">
              <li>X · PRICE LEVEL — BID ← MID → ASK</li>
              <li>Y · DEPTH — LEVEL SIZE</li>
              <li>Z · EVENT PROGRESSION — 48 EV</li>
            </ul>
            <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] leading-none text-body">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-[1px] bg-bid" />
                BID
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-[1px] bg-ask" />
                ASK
              </span>
              <span className="text-faint">FADE = OLDER EVENTS</span>
            </div>
          </div>
        </div>
      }
    >
      {renderChildren}
    </SceneShell>
  );
}
