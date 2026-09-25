"use client";



import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { DecayFeature } from "@/lib/research";
import { SceneShell, type SceneContextValue } from "@/components/three/scene-shell";
import { fmt } from "./primitives";

/* ------------------------------------------------------------------ */
/* Layout constants (deterministic — no randomness anywhere)           */
/* ------------------------------------------------------------------ */

export type DecaySessionMode = "s1" | "s2" | "both";

const MAX_BARS = 6 * 9 * 2; // 6 feature lanes x 9 horizons x 2 sessions
const COL_STEP = 1.15; // X spacing between horizon columns
const LANE_STEP = 1.05; // lane-axis spacing between features
const V_SCALE = 1.3; // vertical half-height of the IC (Z) axis
const LANE_OFFSET = 0.18; // session bar offset along the lane axis (BOTH mode)

const S1_COLOR = "#16294d"; // navy — Session 01 (train)
const S2_COLOR = "#1d5be6"; // accent — Session 02 (unseen)

const N_HORIZONS = 9;
const N_LANES = 6;
const PLANE_W = 11.6;
const PLANE_D = 6.7;
const AXIS_X = -((N_HORIZONS - 1) / 2) * COL_STEP - 0.95;
const AXIS_Z = ((N_LANES - 1) / 2) * LANE_STEP + 1.15;

/** Compact 3D lane labels (display labels only — never research numbers). */
const LANE_SHORT: Record<string, string> = {
  l1_imb: "L1 IMB",
  l5_imb_1k: "L5 1/k",
  l5_imb_uni: "L5 UNI",
  microprice_dev: "MP DEV",
  ofi: "OFI",
  rel_spread: "REL SPR",
};

export interface DecayBarDatum {
  featureKey: string;
  featureLabel: string;
  shortLabel: string;
  featureIndex: number;
  horizon: number;
  horizonIndex: number;
  session: 1 | 2;
  ic: number;
  nObs: number;
}

function buildBars(features: DecayFeature[], mode: DecaySessionMode): DecayBarDatum[] {
  const out: DecayBarDatum[] = [];
  const sessions: (1 | 2)[] = mode === "both" ? [1, 2] : [mode === "s1" ? 1 : 2];
  features.forEach((f, featureIndex) => {
    for (const session of sessions) {
      const points = session === 1 ? f.session_1 : f.session_2;
      points.forEach((p, horizonIndex) => {
        out.push({
          featureKey: f.key,
          featureLabel: f.label,
          shortLabel: LANE_SHORT[f.key] ?? f.key,
          featureIndex,
          horizon: p.horizon,
          horizonIndex,
          session,
          ic: p.ic,
          nObs: p.n_obs,
        });
      });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface SceneProps {
  bars: DecayBarDatum[];
  mode: DecaySessionMode;
  zMax: number;
  hasNegative: boolean;
  registerReset: (fn: () => void) => void;
  onHover: (b: DecayBarDatum | null) => void;
}

function DecayScene({ bars, mode, zMax, hasNegative, registerReset, onHover }: SceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorS1 = useMemo(() => new THREE.Color(S1_COLOR), []);
  const colorS2 = useMemo(() => new THREE.Color(S2_COLOR), []);

  const horizons = useMemo(
    () => Array.from(new Set(bars.map((b) => b.horizon))).sort((a, b) => a - b),
    [bars],
  );
  const laneKeys = useMemo(
    () => Array.from(new Set(bars.map((b) => b.featureIndex))),
    [bars],
  );

  // Imperative instance updates — layout effect so the bars are placed before
  // the browser paints (no identity-matrix flash).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = bars.length;
    const laneWidth = mode === "both" ? 0.3 : 0.52;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const x = (b.horizonIndex - (horizons.length - 1) / 2) * COL_STEP;
      const laneBase = (b.featureIndex - (N_LANES - 1) / 2) * LANE_STEP;
      const laneOffset =
        mode === "both" ? (b.session === 1 ? LANE_OFFSET : -LANE_OFFSET) : 0;
      const y = (b.ic / zMax) * V_SCALE; // signed height
      dummy.position.set(x, y / 2, laneBase + laneOffset);
      dummy.scale.set(0.78, Math.abs(y), laneWidth);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, b.session === 1 ? colorS1 : colorS2);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bars, mode, zMax, horizons.length, dummy, colorS1, colorS2]);

  // Reset-view registration (SceneShell RESET VIEW button).
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
      if (id === undefined || id >= bars.length) {
        onHover(null);
        return;
      }
      onHover(bars[id]);
    },
    [bars, onHover],
  );

  const handleOut = useCallback(() => onHover(null), [onHover]);

  const zTicks = useMemo(() => {
    const ticks: { y: number; label: string }[] = [
      { y: 0, label: "0" },
      { y: (V_SCALE * zMax) / 2, label: `+${(zMax / 2).toFixed(2)}` },
      { y: V_SCALE * zMax, label: `+${zMax.toFixed(2)}` },
    ];
    if (hasNegative) {
      ticks.push({ y: (-V_SCALE * zMax) / 2, label: `-${(zMax / 2).toFixed(2)}` });
      ticks.push({ y: -V_SCALE * zMax, label: `-${zMax.toFixed(2)}` });
    }
    return ticks;
  }, [zMax, hasNegative]);

  return (
    <>
      <ambientLight intensity={0.92} />
      <directionalLight position={[6, 10, 4]} intensity={0.85} />

      {/* Zero base plane — negative IC bars descend below it. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[PLANE_W, PLANE_D]} />
        <meshBasicMaterial
          color="#16294d"
          transparent
          opacity={0.05}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
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

      {/* IC bars — one InstancedMesh box per (feature, horizon, session). */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_BARS]}
        frustumCulled={false}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>

      {/* Z (IC) axis spine + ticks. */}
      <mesh position={[AXIS_X, 0, AXIS_Z]}>
        <boxGeometry args={[0.02, V_SCALE * 2 + 0.1, 0.02]} />
        <meshBasicMaterial color="#c2cfe0" />
      </mesh>
      {zTicks.map((t) => (
        <Html key={t.label} position={[AXIS_X - 0.55, t.y, AXIS_Z]} center zIndexRange={[0, 0]}>
          <div style={axisStyle()}>{t.label}</div>
        </Html>
      ))}
      <Html position={[AXIS_X - 0.35, V_SCALE + 0.28, AXIS_Z]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Z · SPEARMAN IC</div>
      </Html>

      {/* X (horizon) tick labels — one per column, actual published values. */}
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
      <Html position={[0, -V_SCALE - 0.35, AXIS_Z + 0.6]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>X · HORIZON (EVENTS)</div>
      </Html>

      {/* Lane (feature) labels — right side, one per lane. */}
      {laneKeys.map((fi) => {
        const b = bars.find((x) => x.featureIndex === fi);
        if (!b) return null;
        return (
          <Html
            key={b.featureKey}
            position={[((N_HORIZONS - 1) / 2) * COL_STEP + 1.0, 0, (fi - (N_LANES - 1) / 2) * LANE_STEP]}
            center
            zIndexRange={[0, 0]}
          >
            <div style={axisStyle()}>{b.shortLabel}</div>
          </Html>
        );
      })}
      <Html
        position={[((N_HORIZONS - 1) / 2) * COL_STEP + 1.0, V_SCALE + 0.25, ((N_LANES - 1) / 2) * LANE_STEP + 0.9]}
        center
        zIndexRange={[0, 0]}
      >
        <div style={axisStyle()}>Y · FEATURE LANE</div>
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

/* ------------------------------------------------------------------ */
/* Static WebGL fallback                                              */
/* ------------------------------------------------------------------ */

function DecayFallback() {
  return (
    <div className="max-w-xs rounded-md border border-hairline bg-white px-4 py-3 text-center">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
        3D VIEW UNAVAILABLE
      </p>
      <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
        WEBGL IS NOT SUPPORTED ON THIS DEVICE. THE SAME PUBLISHED IC VALUES ARE
        AVAILABLE IN THE IC MATRIX TABLE AND THE IC-VS-HORIZON CHART ABOVE — NO
        SUBSTITUTE VISUALIZATION IS FABRICATED HERE.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper                                                             */
/* ------------------------------------------------------------------ */

export function SignalDecay3D({
  features,
  mode,
}: {
  features: DecayFeature[];
  mode: DecaySessionMode;
}) {
  const [hover, setHover] = useState<DecayBarDatum | null>(null);

  const bars = useMemo(() => buildBars(features, mode), [features, mode]);
  const zMax = useMemo(() => Math.max(0.05, ...bars.map((b) => Math.abs(b.ic))), [bars]);
  const hasNegative = useMemo(() => bars.some((b) => b.ic < 0), [bars]);

  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <DecayScene
        bars={bars}
        mode={mode}
        zMax={zMax}
        hasNegative={hasNegative}
        registerReset={ctx.registerReset}
        onHover={setHover}
      />
    ),
    [bars, mode, zMax, hasNegative],
  );

  return (
    <SceneShell
      badge="RESEARCH OUTPUT"
      hint="DRAG TO ROTATE · SCROLL TO ZOOM · HOVER BARS"
      heightClass="h-[340px] sm:h-[400px] lg:h-[440px]"
      camera={{ fov: 38, position: [9.0, 5.8, 10.8] }}
      fallback={<DecayFallback />}
      ariaLabel="Three-dimensional bar matrix of published Spearman information coefficients: prediction horizon and feature on the horizontal axes, signed IC on the vertical axis, one bar per feature, horizon and session. Real research output."
      overlay={
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[250px] flex-col gap-1.5">
          {hover ? (
            <div className="rounded-md border border-hairline bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
              <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
                BAR · RESEARCH OUTPUT
              </p>
              <div className="mt-1 space-y-[3px] font-mono text-[10px] leading-none tabular-nums">
                <p className="flex justify-between gap-4">
                  <span className="text-body">Feature</span>
                  <span className="font-semibold text-ink">{hover.featureLabel}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Session</span>
                  <span className="font-semibold text-ink">
                    {hover.session === 1 ? "01 · TRAIN" : "02 · UNSEEN"}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Horizon</span>
                  <span className="font-semibold text-ink">{hover.horizon} ev</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Spearman IC</span>
                  <span
                    className="font-semibold"
                    style={{ color: hover.ic >= 0 ? "#0a1b33" : "#c94b4b" }}
                  >
                    {fmt.signed(hover.ic, 4)}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">n obs</span>
                  <span className="font-semibold text-ink">{fmt.int(hover.nObs)}</span>
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
              <li>Y · FEATURE LANE — 6 FEATURES</li>
              <li>Z · SPEARMAN IC — SIGNED · 0 = BASE PLANE</li>
            </ul>
            <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] leading-none text-body">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] rounded-[1px]"
                  style={{ backgroundColor: S1_COLOR }}
                />
                S01
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] rounded-[1px]"
                  style={{ backgroundColor: S2_COLOR }}
                />
                S02
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
