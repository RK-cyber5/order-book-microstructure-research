"use client";



import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { SignalSpacePoint } from "@/lib/research";
import { SceneShell, type SceneContextValue } from "@/components/three/scene-shell";

/* ------------------------------------------------------------------ */
/* Constants (deterministic — the point field itself is fetched)       */
/* ------------------------------------------------------------------ */

export type SpaceFeatureKey = "l1" | "l5" | "microprice" | "ofi";

const MAX_POINTS = 1200;
const SCALE = 1.12; // field values live in [-1, 1] — mapped symmetrically
const POINT_COLOR = "#64748b"; // neutral slate — illustrative, not observations

export const SPACE_FEATURES: { key: SpaceFeatureKey; label: string; axis: string }[] = [
  { key: "l1", label: "L1 Imbalance", axis: "L1 imbalance" },
  { key: "l5", label: "L5 Imbalance", axis: "L5 imbalance" },
  { key: "microprice", label: "Microprice", axis: "Microprice dev" },
  { key: "ofi", label: "OFI", axis: "Order flow imb" },
];

/** World position of one point: X = feature, Y (depth) = microprice,
 *  Z (vertical) = future return. Deterministic pure transform. */
function pointPosition(p: SignalSpacePoint, feature: SpaceFeatureKey): [number, number, number] {
  return [
    (p[feature] ?? 0) * SCALE,
    p.ret * SCALE, // vertical (Z axis of the plot)
    p.microprice * SCALE, // depth (Y axis of the plot)
  ];
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface SceneProps {
  points: SignalSpacePoint[];
  feature: SpaceFeatureKey;
  mobile: boolean;
  registerReset: (fn: () => void) => void;
  onHover: (index: number | null) => void;
}

function SpaceScene({ points, feature, mobile, registerReset, onHover }: SceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const count = Math.min(MAX_POINTS, points.length);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = count;
    for (let i = 0; i < count; i++) {
      const [x, y, z] = pointPosition(points[i], feature);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [points, count, feature, dummy]);

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
      if (id === undefined || id >= count) {
        onHover(null);
        return;
      }
      onHover(id);
    },
    [count, onHover],
  );

  const handleOut = useCallback(() => onHover(null), [onHover]);

  const boxEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 2.3, 2.3)), []);
  useEffect(() => () => boxEdges.dispose(), [boxEdges]);

  const meta = SPACE_FEATURES.find((f) => f.key === feature) ?? SPACE_FEATURES[0];

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_POINTS]}
        frustumCulled={false}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
      >
        <sphereGeometry args={[mobile ? 0.062 : 0.05, 10, 8]} />
        <meshBasicMaterial color={POINT_COLOR} transparent opacity={0.78} depthWrite={false} />
      </instancedMesh>

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
        enableDamping
        dampingFactor={0.08}
        minDistance={2.6}
        maxDistance={11}
      />

      <Html position={[1.32, -1.24, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>X · {meta.axis} →</div>
      </Html>
      <Html position={[-1.32, -1.24, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Y · microprice dev →</div>
      </Html>
      <Html position={[-1.32, 1.3, 0]} center zIndexRange={[0, 0]}>
        <div style={axisStyle()}>Z · future return ↑</div>
      </Html>
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
/* Static WebGL fallback — 2D projection of the REAL point field       */
/* ------------------------------------------------------------------ */

function SpaceFallback({ points, feature }: { points: SignalSpacePoint[]; feature: SpaceFeatureKey }) {
  const meta = SPACE_FEATURES.find((f) => f.key === feature) ?? SPACE_FEATURES[0];
  const pts = points.slice(0, 72).map((p) => ({
    x: 40 + ((p[feature] ?? 0) + 1) * 130,
    y: 150 - (p.ret + 1) * 68,
  }));
  return (
    <svg viewBox="0 0 320 180" className="w-[300px] max-w-full" role="img" aria-label="Static two-dimensional projection of the illustrative signal space point field">
      <line x1="40" y1="152" x2="300" y2="152" stroke="#c2cfe0" />
      <line x1="40" y1="152" x2="40" y2="14" stroke="#c2cfe0" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.7} fill={POINT_COLOR} opacity={0.55} />
      ))}
      <text x="298" y="168" textAnchor="end" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.2">
        X · {meta.axis.toUpperCase()} / Z · FUTURE RETURN
      </text>
      <text x="42" y="12" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.2">
        ILLUSTRATIVE POINT FIELD · 3D UNAVAILABLE
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper                                                             */
/* ------------------------------------------------------------------ */

export function SignalSpace3D({
  points,
  feature,
  overlay,
}: {
  points: SignalSpacePoint[];
  feature: SpaceFeatureKey;
  /** Caption chip (published IC for the current selection) from the parent. */
  overlay?: ReactNode;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const meta = SPACE_FEATURES.find((f) => f.key === feature) ?? SPACE_FEATURES[0];
  const hovered = hoverIdx !== null ? points[hoverIdx] : undefined;

  const renderChildren = useCallback(
    (ctx: SceneContextValue) => (
      <>
        <SpaceScene
          points={points}
          feature={feature}
          mobile={ctx.mobile}
          registerReset={ctx.registerReset}
          onHover={setHoverIdx}
        />
        {hovered ? (
          <Html
            position={pointPosition(hovered, feature)}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="min-w-[150px] rounded-md border border-hairline bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
              <p className="font-mono text-[8.5px] font-medium uppercase tracking-[0.18em] text-faint">
                Point · illustrative
              </p>
              <div className="mt-1 space-y-[3px] font-mono text-[10px] leading-none tabular-nums">
                <p className="flex justify-between gap-5">
                  <span className="text-body">{meta.label}</span>
                  <span className="font-semibold text-ink">{(hovered[feature] ?? 0).toFixed(3)}</span>
                </p>
                <p className="flex justify-between gap-5">
                  <span className="text-body">Microprice</span>
                  <span className="font-semibold text-ink">{hovered.microprice.toFixed(3)}</span>
                </p>
                <p className="flex justify-between gap-5">
                  <span className="text-body">Future ret</span>
                  <span className="font-semibold text-ink">
                    {hovered.ret >= 0 ? "+" : ""}
                    {hovered.ret.toFixed(3)}
                  </span>
                </p>
              </div>
            </div>
          </Html>
        ) : null}
      </>
    ),
    [points, feature, meta, hovered],
  );

  return (
    <SceneShell
      badge="ILLUSTRATIVE SIGNAL SPACE"
      heightClass="h-[340px] sm:h-[400px] lg:h-[440px]"
      camera={{ fov: 42, position: [3.7, 2.8, 4.7] }}
      fallback={<SpaceFallback points={points} feature={feature} />}
      ariaLabel="Three-dimensional scatter of the illustrative signal space point field: selected feature, microprice deviation and future return on separate axes. Deterministic illustrative point field, not research observations."
      hint="DRAG TO ROTATE · SCROLL TO ZOOM · RIGHT-DRAG TO PAN · HOVER POINTS"
      overlay={overlay}
    >
      {renderChildren}
    </SceneShell>
  );
}
