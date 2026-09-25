"use client";



/**
 * Modeled execution surface — 3D.
 *
 * X = latency (published values 0/1/2/5/10 on even slots), Y = spread-cost
 * multiplier (published 0.5×/1.0×/2.0×), Z = modeled net effect in bps
 * (negative extends downward). Values come from the server-side
 * /api/research/execution-grid model; hovering a cell shows its values and
 * clicking selects it (synced with the lab controls). This is a research
 * visualization of modeled assumptions — NOT live trading.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { SceneShell, type SceneContextValue } from "@/components/three/scene-shell";
import { fmt } from "./primitives";

const COL_W = 1.5; // X cell width
const ROW_D = 1.7; // Y cell depth
const Z_SCALE = 3.2; // world height for |zMax| bps
const MAX_CELLS = 5 * 3;

const COL_NEUTRAL = new THREE.Color("#f3c9c9");
const COL_DEEP = new THREE.Color("#b3452f");
const COL_POS = new THREE.Color("#0e9f6e");

export interface SurfaceCell {
  latIdx: number;
  multIdx: number;
  latency: number;
  multiplier: number;
  net: number | null;
  gross: number | null;
  baseCost: number | null;
}

interface SceneProps {
  cells: SurfaceCell[];
  latencies: number[];
  multipliers: number[];
  zMax: number;
  selected: { latIdx: number; multIdx: number } | null;
  registerReset: (fn: () => void) => void;
  onHover: (c: SurfaceCell | null) => void;
  onSelect: (latIdx: number, multIdx: number) => void;
}

function ExecutionSurfaceScene({
  cells,
  latencies,
  multipliers,
  zMax,
  selected,
  registerReset,
  onHover,
  onSelect,
}: SceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const xAt = (i: number) => (i - (latencies.length - 1) / 2) * COL_W;
  const yAt = (j: number) => (j - (multipliers.length - 1) / 2) * ROW_D;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let idx = 0;
    for (const c of cells) {
      if (c.net === null) continue;
      const h = (Math.abs(c.net) / Math.max(1e-6, zMax)) * Z_SCALE;
      const dir = c.net < 0 ? -1 : 1;
      dummy.position.set(xAt(c.latIdx), (dir * h) / 2, yAt(c.multIdx));
      dummy.scale.set(COL_W * 0.94, Math.max(0.04, h), ROW_D * 0.94);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      if (c.net < 0) {
        tmpColor.copy(COL_NEUTRAL).lerp(COL_DEEP, Math.min(1, Math.abs(c.net) / Math.max(1e-6, zMax)));
      } else {
        tmpColor.copy(COL_POS);
      }
      mesh.setColorAt(idx, tmpColor);
      idx++;
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells, zMax, latencies.length, multipliers.length, dummy, tmpColor]);

  // Selected cell marker.
  useLayoutEffect(() => {
    const g = markerRef.current;
    if (!g) return;
    if (!selected) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(xAt(selected.latIdx), 0.06, yAt(selected.multIdx));
  }, [selected, latencies.length, multipliers.length]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => controlsRef.current?.reset());
    });
  }, [registerReset]);

  const cellFromEvent = useCallback(
    (e: { instanceId?: number }): SurfaceCell | null => {
      const id = e.instanceId;
      if (id === undefined) return null;
      const placed: SurfaceCell[] = cells.filter((c) => c.net !== null);
      return placed[id] ?? null;
    },
    [cells],
  );

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 10, 6]} intensity={0.8} />

      {/* Zero reference plane — net=0. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
        <planeGeometry args={[COL_W * (latencies.length + 1), ROW_D * (multipliers.length + 1.2)]} />
        <meshBasicMaterial color="#16294d" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Grid
        position={[0, 0.003, 0]}
        args={[COL_W * (latencies.length + 1), ROW_D * (multipliers.length + 1.2)]}
        cellSize={COL_W / 2}
        cellThickness={0.5}
        cellColor="#e0e7f1"
        sectionSize={COL_W}
        sectionThickness={1}
        sectionColor="#c2cfe0"
        followCamera={false}
        infiniteGrid={false}
      />

      {/* Modeled net cells (stepped surface). */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_CELLS]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHover(cellFromEvent(e));
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          const c = cellFromEvent(e);
          if (c) onSelect(c.latIdx, c.multIdx);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial transparent opacity={0.92} />
      </instancedMesh>

      {/* Selected-cell marker ring. */}
      <group ref={markerRef} visible={false}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[COL_W * 0.62, COL_W * 0.78, 32]} />
          <meshBasicMaterial color="#1d5be6" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Axis labels. */}
      {latencies.map((lat, i) => (
        <Html
          key={`lat-${lat}`}
          position={[xAt(i), Z_SCALE * 0.62, ROW_D * (multipliers.length - 1) / 2 + ROW_D * 0.85]}
          center
          zIndexRange={[0, 0]}
        >
          <div style={axisStyle()}>{lat} EV</div>
        </Html>
      ))}
      <Html
        position={[0, Z_SCALE * 0.62 + 0.45, ROW_D * (multipliers.length - 1) / 2 + ROW_D * 1.4]}
        center
        zIndexRange={[0, 0]}
      >
        <div style={axisStyle()}>X · LATENCY</div>
      </Html>
      {multipliers.map((m, j) => (
        <Html
          key={`mult-${m}`}
          position={[COL_W * (latencies.length - 1) / 2 + COL_W * 0.95, 0, yAt(j)]}
          center
          zIndexRange={[0, 0]}
        >
          <div style={axisStyle()}>{m.toFixed(1)}×</div>
        </Html>
      ))}
      <Html
        position={[COL_W * (latencies.length - 1) / 2 + COL_W * 1.9, Z_SCALE * 0.55, 0]}
        center
        zIndexRange={[0, 0]}
      >
        <div style={axisStyle()}>Y · SPREAD COST ×</div>
      </Html>
      <Html position={[-COL_W * (latencies.length - 1) / 2 - COL_W * 0.7, Z_SCALE, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Z · NET BPS ↓</div>
      </Html>
      <Html position={[-COL_W * (latencies.length - 1) / 2 - COL_W * 0.7, -Z_SCALE, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>−{fmt.bps(zMax, 0)} BPS</div>
      </Html>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, -0.6, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={18}
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

function SurfaceFallback() {
  return (
    <div className="max-w-xs rounded-md border border-hairline bg-white px-4 py-3 text-center">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
        3D VIEW UNAVAILABLE
      </p>
      <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
        WEBGL IS NOT SUPPORTED. THE SAME MODELED NET-VALUES ARE IN THE LATENCY
        TABLE AND RESULT READOUT.
      </p>
    </div>
  );
}

export function ExecutionSurface3D({
  cells,
  latencies,
  multipliers,
  zMax,
  selected,
  onSelect,
}: {
  cells: SurfaceCell[];
  latencies: number[];
  multipliers: number[];
  zMax: number;
  selected: { latIdx: number; multIdx: number } | null;
  onSelect: (latIdx: number, multIdx: number) => void;
}) {
  const [hover, setHover] = useState<SurfaceCell | null>(null);
  const readout = hover ?? cells.find((c) => selected && c.latIdx === selected.latIdx && c.multIdx === selected.multIdx) ?? null;

  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <ExecutionSurfaceScene
        cells={cells}
        latencies={latencies}
        multipliers={multipliers}
        zMax={zMax}
        selected={selected}
        registerReset={ctx.registerReset}
        onHover={setHover}
        onSelect={onSelect}
      />
    ),
    [cells, latencies, multipliers, zMax, selected, onSelect],
  );

  return (
    <SceneShell
      badge="MODELED EXECUTION — NOT LIVE TRADING"
      hint="DRAG TO ROTATE · SCROLL TO ZOOM · HOVER CELLS · CLICK TO SELECT"
      heightClass="h-[340px] sm:h-[400px] lg:h-[460px]"
      camera={{ fov: 42, position: [7.2, 5.4, 8.2] }}
      fallback={<SurfaceFallback />}
      ariaLabel="Modeled execution surface: latency and spread-cost multiplier on the horizontal axes, modeled net effect in basis points extending downward. Research visualization of modeled assumptions, not live trading."
      overlay={
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[250px] flex-col gap-1.5">
          {readout && readout.net !== null ? (
            <div className="rounded-md border border-hairline bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
              <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
                Cell · modeled
              </p>
              <div className="mt-1 space-y-[3px] font-mono text-[10px] leading-none tabular-nums">
                <p className="flex justify-between gap-4">
                  <span className="text-body">Latency</span>
                  <span className="font-semibold text-ink">{readout.latency} ev</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Multiplier</span>
                  <span className="font-semibold text-ink">{readout.multiplier.toFixed(1)}×</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Gross</span>
                  <span className="font-semibold text-ink">{fmt.bps(readout.gross, 4)} bps</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-body">Modeled net</span>
                  <span className="font-semibold" style={{ color: readout.net < 0 ? "#c94b4b" : "#0e9f6e" }}>
                    {fmt.signed(readout.net, 4)} bps
                  </span>
                </p>
              </div>
            </div>
          ) : null}
          <div className="rounded-md border border-amber-400/40 bg-amber-50/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
            <p className="font-mono text-[8.5px] leading-relaxed text-amber-900">
              MODELED SURFACE — net = gross(latency) − multiplier × base spread
              cost. Grid values coincide with published rows at every
              intersection.
            </p>
          </div>
        </div>
      }
    >
      {renderChildren}
    </SceneShell>
  );
}
