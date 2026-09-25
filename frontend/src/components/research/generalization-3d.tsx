"use client";



/**
 * Generalization 3D view — train vs test IC landscape.
 *
 * REAL research observations only: one bar per (feature, horizon) from the
 * cross-session rows (train = Session 01, test = unseen Session 02), i.e.
 * results/horizon_analysis.csv. Modes: Session 01 / Session 02 / Overlay.
 * Point-level event data is not published — session point clouds are
 * therefore intentionally NOT shown (stated in the panel below the scene).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { CrossSessionRow } from "@/lib/research";
import { SceneShell, type SceneContextValue } from "@/components/three/scene-shell";
import { fmt } from "./primitives";

export type GenMode = "s1" | "s2" | "overlay";

const FEATURES = ["l1_imb", "l5_imb_1k", "microprice_dev", "ofi"] as const;
const FEATURE_SHORT: Record<string, string> = {
  l1_imb: "L1 IMB",
  l5_imb_1k: "L5 1/k",
  microprice_dev: "MP DEV",
  ofi: "OFI",
};
const S1_COLOR = "#16294d";
const S2_COLOR = "#1d5be6";

const COL_STEP = 1.15;
const LANE_STEP = 1.3;
const V_SCALE = 1.3;
const LANE_OFFSET = 0.22;
const MAX_BARS = 4 * 9 * 2;
const N_H = 9;
const PLANE_W = 11.6;
const PLANE_D = 6.4;
const AXIS_X = -((N_H - 1) / 2) * COL_STEP - 0.95;
const AXIS_Z = 3.6;

export interface GenBarDatum {
  feature: string;
  shortLabel: string;
  horizon: number;
  horizonIndex: number;
  which: "train" | "test";
  ic: number;
  ciLow: number | null;
  ciHigh: number | null;
}

function buildBars(rows: CrossSessionRow[]): GenBarDatum[] {
  const out: GenBarDatum[] = [];
  FEATURES.forEach((f, fi) => {
    const fRows = rows
      .filter((r) => r.feature === f)
      .sort((a, b) => a.horizon - b.horizon);
    fRows.forEach((r, hi) => {
      out.push({
        feature: r.feature,
        shortLabel: FEATURE_SHORT[r.feature] ?? r.feature,
        horizon: r.horizon,
        horizonIndex: hi,
        which: "train",
        ic: r.train_spearman ?? 0,
        ciLow: r.train_ci_low,
        ciHigh: r.train_ci_high,
      });
      out.push({
        feature: r.feature,
        shortLabel: FEATURE_SHORT[r.feature] ?? r.feature,
        horizon: r.horizon,
        horizonIndex: hi,
        which: "test",
        ic: r.test_spearman ?? 0,
        ciLow: r.test_ci_low,
        ciHigh: r.test_ci_high,
      });
    });
    void fi;
  });
  return out;
}

function GeneralizationScene({
  bars,
  mode,
  zMax,
  registerReset,
  onHover,
}: {
  bars: GenBarDatum[];
  mode: GenMode;
  zMax: number;
  registerReset: (fn: () => void) => void;
  onHover: (b: GenBarDatum | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const c1 = useMemo(() => new THREE.Color(S1_COLOR), []);
  const c2 = useMemo(() => new THREE.Color(S2_COLOR), []);

  const visible = useMemo(
    () =>
      mode === "overlay"
        ? bars
        : bars.filter((b) => (mode === "s1" ? b.which === "train" : b.which === "test")),
    [bars, mode],
  );

  const horizons = useMemo(() => {
    const set = new Set(visible.map((b) => b.horizon));
    return Array.from(set).sort((a, b) => a - b);
  }, [visible]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let i = 0;
    for (const b of visible) {
      const laneIdx = FEATURES.indexOf(b.feature as (typeof FEATURES)[number]);
      const x = (b.horizonIndex - (horizons.length - 1) / 2) * COL_STEP;
      const laneBase = (laneIdx - (FEATURES.length - 1) / 2) * LANE_STEP;
      const off = mode === "overlay" ? (b.which === "train" ? LANE_OFFSET : -LANE_OFFSET) : 0;
      const y = (b.ic / zMax) * V_SCALE;
      dummy.position.set(x, y / 2, laneBase + off);
      dummy.scale.set(0.62, Math.abs(y), mode === "overlay" ? 0.42 : 0.72);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, b.which === "train" ? c1 : c2);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [visible, mode, zMax, horizons.length, dummy, c1, c2]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => controlsRef.current?.reset());
    });
  }, [registerReset]);

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id === undefined || id >= visible.length) {
        onHover(null);
        return;
      }
      onHover(visible[id]);
    },
    [visible, onHover],
  );

  return (
    <>
      <ambientLight intensity={0.92} />
      <directionalLight position={[6, 10, 4]} intensity={0.85} />

      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PLANE_W, PLANE_D]} />
        <meshBasicMaterial color="#16294d" transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[PLANE_W, PLANE_D]}
        cellSize={COL_STEP / 2}
        cellThickness={0.5}
        cellColor="#e0e7f1"
        sectionSize={COL_STEP}
        sectionThickness={1}
        sectionColor="#c2cfe0"
        followCamera={false}
        infiniteGrid={false}
      />

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_BARS]}
        frustumCulled={false}
        onPointerMove={handleMove}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>

      {/* Axis labels. */}
      {horizons.map((h, i) => (
        <Html
          key={h}
          position={[(i - (horizons.length - 1) / 2) * COL_STEP, -V_SCALE - 0.35, AXIS_Z]}
          center
          zIndexRange={[0, 0]}
        >
          <div style={axisStyle()}>{h}</div>
        </Html>
      ))}
      <Html position={[0, -V_SCALE - 0.35, AXIS_Z + 0.75]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>X · HORIZON (EVENTS)</div>
      </Html>
      <Html position={[AXIS_X, V_SCALE * 0.5, AXIS_Z]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Z · IC</div>
      </Html>
      <Html position={[AXIS_X, V_SCALE + 0.3, AXIS_Z]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>+{zMax.toFixed(2)}</div>
      </Html>
      <Html position={[AXIS_X, -V_SCALE - 0.1, AXIS_Z]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>−{zMax.toFixed(2)}</div>
      </Html>
      {FEATURES.map((f, i) => (
        <Html
          key={f}
          position={[(N_H - 1) / 2 * COL_STEP + 1.1, 0, (i - (FEATURES.length - 1) / 2) * LANE_STEP]}
          center
          zIndexRange={[0, 0]}
        >
          <div style={axisStyle()}>{FEATURE_SHORT[f]}</div>
        </Html>
      ))}
      <Html
        position={[(N_H - 1) / 2 * COL_STEP + 1.1, V_SCALE + 0.25, 2.6]}
        center
        zIndexRange={[0, 0]}
      >
        <div style={axisStyle()}>Y · FEATURE</div>
      </Html>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.5}
        maxDistance={22}
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

function GenFallback() {
  return (
    <div className="max-w-xs rounded-md border border-hairline bg-white px-4 py-3 text-center">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
        3D VIEW UNAVAILABLE
      </p>
      <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
        WEBGL IS NOT SUPPORTED. THE SAME PUBLISHED TRAIN/TEST IC VALUES ARE IN
        THE IC COMPARISON CHART AND TABLE — NO SUBSTITUTE IS FABRICATED.
      </p>
    </div>
  );
}

export function Generalization3D({ rows, mode }: { rows: CrossSessionRow[]; mode: GenMode }) {
  const [hover, setHover] = useState<GenBarDatum | null>(null);
  const bars = useMemo(() => buildBars(rows), [rows]);
  const zMax = useMemo(
    () => Math.max(0.05, ...bars.map((b) => Math.abs(b.ic))),
    [bars],
  );

  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <GeneralizationScene
        bars={bars}
        mode={mode}
        zMax={zMax}
        registerReset={ctx.registerReset}
        onHover={setHover}
      />
    ),
    [bars, mode, zMax],
  );

  return (
    <SceneShell
      badge="RESEARCH OUTPUT"
      hint="DRAG TO ROTATE · SCROLL TO ZOOM · HOVER BARS"
      heightClass="h-[340px] sm:h-[400px] lg:h-[440px]"
      camera={{ fov: 38, position: [9.0, 5.8, 10.6] }}
      fallback={<GenFallback />}
      ariaLabel="Three-dimensional landscape of published train and test information coefficients across features and horizons. Real research output."
      overlay={
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[250px] flex-col gap-1.5">
          {hover ? (
            <div className="rounded-md border border-hairline bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
              <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
                BAR · RESEARCH OUTPUT
              </p>
              <div className="mt-1 space-y-[3px] font-mono text-[10px] leading-none tabular-nums">
                <p className="flex justify-between gap-4">
                  <span className="text-body">Set</span>
                  <span className="font-semibold text-ink">
                    {hover.which === "train" ? "TRAIN · S01" : "TEST · S02"}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Feature</span>
                  <span className="font-semibold text-ink">{hover.shortLabel}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Horizon</span>
                  <span className="font-semibold text-ink">{hover.horizon} ev</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">IC</span>
                  <span className="font-semibold" style={{ color: hover.ic >= 0 ? "#0a1b33" : "#c94b4b" }}>
                    {fmt.signed(hover.ic, 4)}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">95% CI</span>
                  <span className="font-semibold text-ink">
                    {hover.ciLow !== null && hover.ciHigh !== null
                      ? `[${fmt.dec(hover.ciLow, 3)}, ${fmt.dec(hover.ciHigh, 3)}]`
                      : "—"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
          <div className="rounded-md border border-hairline bg-white/85 px-2.5 py-2 shadow-sm backdrop-blur-sm">
            <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              AXES
            </p>
            <ul className="mt-1 space-y-[2px] font-mono text-[9px] leading-none text-body">
              <li>X · HORIZON — 9 EVENT-TIME VALUES</li>
              <li>Y · FEATURE — 4 MICROSTRUCTURE SIGNALS</li>
              <li>Z · SPEARMAN IC — SIGNED</li>
            </ul>
            <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] leading-none text-body">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-[1px]" style={{ backgroundColor: S1_COLOR }} />
                TRAIN S01
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-[1px]" style={{ backgroundColor: S2_COLOR }} />
                TEST S02
              </span>
            </div>
          </div>
        </div>
      }
    >
      {renderChildren}
    </SceneShell>
  );
}
