"use client";

/* eslint-disable react-hooks/immutability -- three.js scenes are imperative by design: buffers, matrices and uniforms are mutated inside useFrame/effects (never during React render). */

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { SignalSpacePoint } from "@/lib/research";
import { SceneShell, type SceneContextValue } from "./scene-shell";

export type SpaceFeature = "l1" | "l5" | "microprice" | "ofi";

export const SPACE_FEATURES: { key: SpaceFeature; label: string; axis: string }[] = [
  { key: "l1", label: "L1 Imbalance", axis: "L1 imbalance" },
  { key: "l5", label: "L5 Imbalance", axis: "L5 imbalance" },
  { key: "microprice", label: "Microprice", axis: "Microprice dev" },
  { key: "ofi", label: "OFI", axis: "Order flow imb" },
];

export interface HoverInfo {
  index: number;
  position: [number, number, number];
  point: SignalSpacePoint;
}

interface SceneProps {
  points: SignalSpacePoint[];
  feature: SpaceFeature;
  featureAxisLabel: string;
  mobile: boolean;
  registerReset: (fn: () => void) => void;
  onHover: (h: HoverInfo | null) => void;
}

const CAPACITY = 1200;

function RaycastThreshold() {
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    if (!raycaster.params.Points) raycaster.params.Points = { threshold: 0.06 };
    raycaster.params.Points.threshold = 0.06;
  }, [raycaster]);
  return null;
}

function SignalSpaceScene({ points, feature, featureAxisLabel, mobile, registerReset, onHover }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const count = Math.min(CAPACITY, points.length, mobile ? 420 : CAPACITY);

  const { geometry, positions, targets, colors } = useMemo(() => {
    const positions = new Float32Array(CAPACITY * 3);
    const targets = new Float32Array(CAPACITY * 3);
    const colors = new Float32Array(CAPACITY * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);
    return { geometry, positions, targets, colors };
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Points arrive from the research API; color by future-return direction.
  useEffect(() => {
    if (count === 0) return;
    const bid = new THREE.Color("#0e9f6e");
    const ask = new THREE.Color("#e05252");
    const neutral = new THREE.Color("#aab6c8");
    for (let i = 0; i < count; i++) {
      const ret = points[i].ret;
      const base = ret >= 0 ? bid : ask;
      const t = Math.min(1, Math.abs(ret) * 1.35);
      const mixed = base.clone().lerp(neutral, 1 - 0.75 * t);
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }
    const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
  }, [points, count, colors, geometry]);

  // Targets for the currently selected X feature.
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const p = points[i];
      targets[i * 3] = (p[feature] ?? 0) * 1.05;
      targets[i * 3 + 1] = p.microprice * 1.05;
      targets[i * 3 + 2] = p.ret * 1.15;
    }
  }, [points, count, feature, targets]);

  useEffect(() => {
    geometry.setDrawRange(0, count);
  }, [geometry, count]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => controlsRef.current?.reset());
    });
  }, [registerReset]);

  useFrame((_, delta) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const k = 1 - Math.exp(-Math.min(delta, 0.08) * 3.6);
    let moving = false;
    for (let i = 0; i < count * 3; i++) {
      const diff = targets[i] - positions[i];
      if (Math.abs(diff) > 5e-4) {
        positions[i] += diff * k;
        moving = true;
      } else {
        positions[i] = targets[i];
      }
    }
    if (moving) attr.needsUpdate = true;
  });

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const i = e.index;
      if (i === undefined || i >= count) return;
      onHover({
        index: i,
        position: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
        point: points[i],
      });
    },
    [count, onHover, points, positions],
  );

  const handleOut = useCallback(() => onHover(null), [onHover]);

  const boxEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 2.3, 2.3)), []);
  useEffect(() => () => boxEdges.dispose(), [boxEdges]);

  return (
    <>
      <RaycastThreshold />

      <points geometry={geometry} onPointerMove={handleMove} onPointerOut={handleOut}>
        <pointsMaterial size={0.052} sizeAttenuation vertexColors transparent opacity={0.72} depthWrite={false} />
      </points>

      <lineSegments geometry={boxEdges}>
        <lineBasicMaterial color="#c2cfe0" transparent opacity={0.55} />
      </lineSegments>
      <Grid
        position={[0, -1.16, 0]}
        args={[2.4, 2.4]}
        cellSize={0.29}
        cellThickness={0.6}
        cellColor="#dfe7f1"
        sectionSize={1.16}
        sectionThickness={1}
        sectionColor="#c2cfe0"
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0]}
        autoRotate
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={3.2}
        maxDistance={10}
      />

      <Html position={[1.32, -1.24, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>{featureAxisLabel} →</div>
      </Html>
      <Html position={[-1.32, 1.24, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Microprice dev ↑</div>
      </Html>
      <Html position={[0, -1.24, -1.34]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>← Future return</div>
      </Html>
    </>
  );
}

function axisStyle(): React.CSSProperties {
  return {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "9px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#64748b",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
  };
}

function SpaceFallback() {
  const pts = Array.from({ length: 46 }, (_, i) => {
    const x = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const y = Math.abs((Math.sin(i * 78.233) * 12543.1234) % 1);
    return { x: 50 + x * 230, y: 26 + y * 120, r: 1.6 + x * 2 };
  });
  return (
    <svg viewBox="0 0 320 180" className="w-[320px] max-w-full" role="img" aria-label="Static scatter illustration">
      <line x1="40" y1="152" x2="300" y2="152" stroke="#c2cfe0" />
      <line x1="40" y1="152" x2="40" y2="14" stroke="#c2cfe0" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={i % 2 ? "#0e9f6e" : "#e05252"} opacity={0.45} />
      ))}
      <text x="298" y="168" textAnchor="end" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.4">
        SIGNAL SPACE · 3D UNAVAILABLE
      </text>
    </svg>
  );
}

export function SignalSpaceStage({
  points,
  feature,
  onHover,
  hover,
}: {
  points: SignalSpacePoint[];
  feature: SpaceFeature;
  onHover: (h: HoverInfo | null) => void;
  hover: HoverInfo | null;
}) {
  const meta = SPACE_FEATURES.find((f) => f.key === feature) ?? SPACE_FEATURES[0];

  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <>
        <SignalSpaceScene
          points={points}
          feature={feature}
          featureAxisLabel={meta.axis}
          mobile={ctx.mobile}
          registerReset={ctx.registerReset}
          onHover={onHover}
        />
        {hover ? (
          <Html position={hover.position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div className="min-w-[150px] rounded-md border border-hairline bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
              <p className="font-mono text-[8.5px] font-medium uppercase tracking-[0.18em] text-faint">
                Observation · illustrative
              </p>
              <div className="mt-1 space-y-[3px] font-mono text-[10px] leading-none tabular-nums">
                <p className="flex justify-between gap-5">
                  <span className="text-body">{meta.label}</span>
                  <span className="font-semibold text-ink">{hover.point[feature].toFixed(3)}</span>
                </p>
                <p className="flex justify-between gap-5">
                  <span className="text-body">Microprice</span>
                  <span className="font-semibold text-ink">{hover.point.microprice.toFixed(3)}</span>
                </p>
                <p className="flex justify-between gap-5">
                  <span className="text-body">Future ret</span>
                  <span
                    className="font-semibold"
                    style={{ color: hover.point.ret >= 0 ? "#0b8a60" : "#c94b4b" }}
                  >
                    {hover.point.ret >= 0 ? "+" : ""}
                    {hover.point.ret.toFixed(3)}
                  </span>
                </p>
              </div>
            </div>
          </Html>
        ) : null}
      </>
    ),
    [points, feature, meta, onHover, hover],
  );

  return (
    <SceneShell
      badge="Illustrative signal space"
      heightClass="h-[420px] sm:h-[480px] lg:h-[520px]"
      camera={{ fov: 42, position: [3.6, 2.7, 4.6] }}
      fallback={<SpaceFallback />}
      ariaLabel="Three-dimensional scatter of illustrative microstructure observations: selected feature, microprice deviation and future return on separate axes. Illustrative data, not research output."
      hint="Drag to rotate · scroll to zoom · hover points"
    >
      {renderChildren}
    </SceneShell>
  );
}
