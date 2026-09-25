let _seed = 42;
function seededRandom() { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; }
"use client";

/* eslint-disable react-hooks/immutability -- three.js scenes are imperative by design: buffers, matrices and uniforms are mutated inside useFrame/effects (never during React render). */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BookSim, BOOK_GRID, type BookSimState } from "./book-sim";
import { SceneShell, type SceneContextValue } from "./scene-shell";

const { T, P } = BOOK_GRID;
const MAX_H = 2.8;
const slotX = (p: number) => (p - 5.5) * 0.62;
const slotZ = (t: number) => 2.6 - t * 0.52;

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

interface SceneProps {
  sim: BookSim;
  mobile: boolean;
  reduced: boolean;
  registerReset: (fn: () => void) => void;
}

const BID_COLOR = new THREE.Color("#0e9f6e");
const ASK_COLOR = new THREE.Color("#e05252");
const AGE_COLOR = new THREE.Color("#93a7c2");

function OrderBookSceneImpl({ sim, mobile, registerReset }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const bookRef = useRef<THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>(null);
  const flowRef = useRef<THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>(null);
  const bestBidRef = useRef<THREE.Mesh>(null);
  const bestAskRef = useRef<THREE.Mesh>(null);
  const probeRef = useRef<THREE.Group>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const heights = useMemo(() => new Float32Array(T * P).fill(0.05), []);
  const flowCount = mobile ? 34 : 72;

  const particles = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => ({
        x: seededRandom() < 0.68 ? (seededRandom() < 0.5 ? -4.35 : 4.35) + (seededRandom() - 0.5) * 0.35 : (seededRandom() - 0.5) * 6.4,
        y: 0.35 + seededRandom() * 2.9,
        z: -12 - seededRandom() * 10,
        speed: 2.6 + seededRandom() * 3.4,
        type: (seededRandom() < 0.56 ? 0 : seededRandom() < 0.62 ? 1 : 2) as 0 | 1 | 2,
        scale: 0.65 + seededRandom() * 0.7,
        lane: i,
      })),
    [],
  );

  // Register camera reset + save initial state.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => {
        const c = controlsRef.current;
        if (c) c.reset();
      });
    });
  }, [registerReset]);

  // Instance colors (bid/ask sides, aged toward neutral for depth cue).
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const color = new THREE.Color();
    for (let t = 0; t < T; t++) {
      for (let p = 0; p < P; p++) {
        const side = p <= 5 ? BID_COLOR : ASK_COLOR;
        color.copy(side).lerp(AGE_COLOR, (t / T) * 0.38);
        book.setColorAt(t * P + p, color);
      }
    }
    if (book.instanceColor) book.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const color = new THREE.Color();
    const palette = ["#2f63d8", "#98a7bb", "#e05252"];
    for (let i = 0; i < 72; i++) {
      color.set(palette[particles[i].type]);
      flow.setColorAt(i, color);
    }
    if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.08);
    const book = bookRef.current;
    if (book) {
      const frames = sim.frames;
      const k = 1 - Math.exp(-dt * 6.5);
      for (let t = 0; t < T; t++) {
        const frame = frames[Math.min(t, frames.length - 1)];
        for (let p = 0; p < P; p++) {
          const idx = t * P + p;
          const target = Math.min(1.2, frame[p] ?? 0.05);
          heights[idx] += (target - heights[idx]) * k;
          const h = Math.max(0.05, heights[idx]) * MAX_H;
          dummy.position.set(slotX(p), h / 2, slotZ(t));
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          book.setMatrixAt(idx, dummy.matrix);
        }
      }
      book.instanceMatrix.needsUpdate = true;

      // Best bid / ask touch markers track the front frame.
      const front = frames[0] ?? [];
      const bidH = Math.max(0.08, Math.min(1.2, front[5] ?? 0.1)) * MAX_H;
      const askH = Math.max(0.08, Math.min(1.2, front[6] ?? 0.1)) * MAX_H;
      if (bestBidRef.current) bestBidRef.current.position.y = bidH + 0.22;
      if (bestAskRef.current) bestAskRef.current.position.y = askH + 0.22;

      // Microprice probe slides between the touch levels.
      const bidVol = front[5] ?? 0.5;
      const askVol = front[6] ?? 0.5;
      const imb = (bidVol - askVol) / Math.max(1e-6, bidVol + askVol);
      const targetX = THREE.MathUtils.clamp(imb * 0.34, -0.3, 0.3);
      if (probeRef.current) {
        probeRef.current.position.x += (targetX - probeRef.current.position.x) * k;
      }
    }

    // Order-flow particles stream toward the present.
    const flow = flowRef.current;
    if (flow) {
      for (let i = 0; i < flowCount; i++) {
        const particle = particles[i];
        particle.z += particle.speed * dt;
        if (particle.z > 5) {
          particle.z = -13 - seededRandom() * 4;
          particle.x =
            seededRandom() < 0.68
              ? (seededRandom() < 0.5 ? -4.35 : 4.35) + (seededRandom() - 0.5) * 0.35
              : (seededRandom() - 0.5) * 6.4;
          particle.y = 0.35 + seededRandom() * 2.9;
          particle.speed = 2.6 + seededRandom() * 3.4;
        }
        const fade = Math.min(1, Math.max(0, (particle.z + 13) / 2.2)) * Math.min(1, Math.max(0, (4.6 - particle.z) / 1.4));
        dummy.position.set(particle.x, particle.y, particle.z);
        dummy.scale.setScalar(particle.scale * (0.55 + fade * 0.6));
        dummy.updateMatrix();
        flow.setMatrixAt(i, dummy.matrix);
      }
      flow.count = flowCount;
      flow.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#f3f6fb", 17, 36]} />

      <ambientLight intensity={1.35} />
      <directionalLight position={[7, 11, 5]} intensity={2.1} />
      <directionalLight position={[-7, 5, 6]} intensity={0.55} color="#dce7f8" />
      <pointLight position={[0, 5.2, 7]} intensity={18} distance={16} decay={2} color="#cddcff" />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 1.15, -2.4]}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={6.5}
        maxDistance={24}
        minPolarAngle={0.45}
        maxPolarAngle={1.35}
      />

      {/* Liquidity depth columns */}
      <instancedMesh ref={bookRef} args={[undefined, undefined, T * P]} castShadow={false}>
        <boxGeometry args={[0.42, 1, 0.42]} />
        <meshStandardMaterial roughness={0.36} metalness={0.08} />
      </instancedMesh>

      {/* Mid-price reference plane + line */}
      <mesh position={[0, 1.9, -3.95]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[13.2, 3.8]} />
        <meshBasicMaterial color="#1d5be6" transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.78, -3.95]}>
        <boxGeometry args={[13.2, 0.03, 0.03]} />
        <meshBasicMaterial color="#1d5be6" transparent opacity={0.4} />
      </mesh>

      {/* Best bid / ask touch markers */}
      <mesh ref={bestBidRef} position={[-0.31, 1, 2.85]}>
        <boxGeometry args={[0.17, 0.14, 0.17]} />
        <meshStandardMaterial color="#0b8a60" emissive="#0e9f6e" emissiveIntensity={0.65} roughness={0.3} />
      </mesh>
      <mesh ref={bestAskRef} position={[0.31, 1, 2.85]}>
        <boxGeometry args={[0.17, 0.14, 0.17]} />
        <meshStandardMaterial color="#c94b4b" emissive="#e05252" emissiveIntensity={0.65} roughness={0.3} />
      </mesh>

      {/* Microprice probe */}
      <group ref={probeRef} position={[0.12, 0, 2.85]}>
        <mesh position={[0, 1.85, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 3.7, 8]} />
          <meshBasicMaterial color="#1d5be6" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 3.78, 0]}>
          <octahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial color="#1d5be6" emissive="#1d5be6" emissiveIntensity={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* Order-flow event particles */}
      <instancedMesh ref={flowRef} args={[undefined, undefined, 72]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.85} />
      </instancedMesh>

      {/* Floor grid */}
      <Grid
        position={[0, 0, -3.9]}
        args={[26, 15]}
        cellSize={0.62}
        cellThickness={0.6}
        cellColor="#dfe7f1"
        sectionSize={3.1}
        sectionThickness={1}
        sectionColor="#c2cfe0"
        fadeDistance={32}
        fadeStrength={1.4}
      />

      <AxisLabels />
    </>
  );
}

function labelStyle(): React.CSSProperties {
  return {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "9.5px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#64748b",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
  };
}

function AxisLabels() {
  return (
    <>
      <Html position={[-5.9, 0.14, 3.6]} center zIndexRange={[0, 0]}>
        <div style={labelStyle()}>← Bid side</div>
      </Html>
      <Html position={[5.9, 0.14, 3.6]} center zIndexRange={[0, 0]}>
        <div style={labelStyle()}>Ask side →</div>
      </Html>
      <Html position={[0, 0.14, -11.6]} center zIndexRange={[0, 0]}>
        <div style={labelStyle()}>← Event time</div>
      </Html>
      <Html position={[-5.9, 2.1, -2]} center zIndexRange={[0, 0]}>
        <div style={labelStyle()}>Depth ↑</div>
      </Html>
      <Html position={[0, 4.4, -3.95]} center zIndexRange={[0, 0]}>
        <div style={{ ...labelStyle(), color: "#1d5be6", letterSpacing: "0.22em" }}>Mid-price plane</div>
      </Html>
    </>
  );
}

const OrderBookScene = memo(OrderBookSceneImpl);

/* ------------------------------------------------------------------ */
/* DOM HUD + L2 ladder (simulated presentational values)                */
/* ------------------------------------------------------------------ */

function useBookSimState(sim: BookSim): BookSimState {
  const [state, setState] = useState<BookSimState>(() => sim.snapshot());
  useEffect(() => {
    const unsubscribe = sim.subscribe(setState);
    return unsubscribe;
  }, [sim]);
  return state;
}

function OrderBookHud({ state }: { state: BookSimState }) {
  const imb = state.imbalance;
  const rows: [string, string, string?][] = [
    ["EVENT", String(state.event).padStart(8, "0")],
    ["MID", state.mid.toFixed(2)],
    ["SPREAD", `${state.spreadBps.toFixed(1)} bps`],
    ["IMBALANCE", `${imb >= 0 ? "+" : ""}${imb.toFixed(2)}`, imb >= 0 ? "#0b8a60" : "#c94b4b"],
  ];
  return (
    <div className="rounded-md border border-hairline bg-white/70 px-3 py-2.5 backdrop-blur-sm">
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-faint">
        L2 Depth · Sim
      </p>
      <div className="mt-1.5 space-y-[3px]">
        {rows.map(([label, value, color]) => (
          <p key={label} className="flex items-baseline gap-2 font-mono text-[10.5px] leading-none">
            <span className="w-[74px] shrink-0 text-faint/80">{label}</span>
            <span className="tabular-nums font-medium" style={color ? { color } : undefined}>
              {value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function LadderPanel({ state }: { state: BookSimState }) {
  const maxSize = 640;
  const Row = ({ price, size, side }: { price: string; size: number; side: "bid" | "ask" }) => (
    <div className="flex items-center gap-2 py-[2.5px] font-mono text-[10.5px] leading-none">
      <span className="w-[52px] tabular-nums text-body">{price}</span>
      <span className="w-[38px] text-right tabular-nums font-medium text-ink">{size}</span>
      <span className="relative h-[7px] flex-1 overflow-hidden rounded-[2px] bg-hairline-soft">
        <span
          className={side === "bid" ? "absolute inset-y-0 right-0 bg-bid/70" : "absolute inset-y-0 right-0 bg-ask/70"}
          style={{ width: `${Math.min(100, (size / maxSize) * 100)}%` }}
        />
      </span>
    </div>
  );

  return (
    <div className="w-[176px] rounded-md border border-hairline bg-white/75 p-2.5 backdrop-blur-sm sm:w-[188px]">
      <div className="flex items-baseline justify-between border-b border-hairline-soft pb-1.5">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-faint">Ask</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ask/80">Top 3</span>
      </div>
      <div className="pt-1">
        {[2, 1, 0].map((i) => (
          <Row key={`a${i}`} price={state.askPrices[i].toFixed(2)} size={state.askSizes[i]} side="ask" />
        ))}
      </div>
      <div className="my-1 flex items-baseline justify-between border-y border-hairline-soft bg-accent-soft/50 px-1 py-1">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-accent-deep">Mid</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-accent-deep">
          {state.mid.toFixed(2)}
        </span>
      </div>
      <div className="pb-1">
        {[0, 1, 2].map((i) => (
          <Row key={`b${i}`} price={state.bidPrices[i].toFixed(2)} size={state.bidSizes[i]} side="bid" />
        ))}
      </div>
      <div className="flex items-baseline justify-between border-t border-hairline-soft pt-1.5 font-mono text-[9px] tabular-nums text-faint/80">
        <span>{state.timestamp}</span>
        <span>{String(state.event).padStart(8, "0")}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Static fallback (no WebGL)                                           */
/* ------------------------------------------------------------------ */

function BookFallback() {
  const rows = [
    { price: "102.41", size: 140, side: "ask" },
    { price: "102.40", size: 280, side: "ask" },
    { price: "102.39", size: 195, side: "ask" },
    { price: "102.37", size: 310, side: "bid" },
    { price: "102.36", size: 185, side: "bid" },
    { price: "102.35", size: 420, side: "bid" },
  ];
  return (
    <div className="w-[220px] rounded-md border border-hairline bg-white p-4">
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-faint">L2 book · static view</p>
      <p className="my-2 border-y border-hairline-soft py-1 text-center font-mono text-xs font-semibold tabular-nums text-accent-deep">
        MID 102.38
      </p>
      {rows.map((r) => (
        <div key={r.price} className="flex items-center gap-3 py-1 font-mono text-[11px] tabular-nums">
          <span className="w-14 text-body">{r.price}</span>
          <span className="w-8 text-right font-medium text-ink">{r.size}</span>
          <span className="relative h-2 flex-1 rounded-[2px] bg-hairline-soft">
            <span
              className={r.side === "bid" ? "absolute inset-y-0 right-0 rounded-[2px] bg-bid/70" : "absolute inset-y-0 right-0 rounded-[2px] bg-ask/70"}
              style={{ width: `${(r.size / 440) * 100}%` }}
            />
          </span>
        </div>
      ))}
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-faint/70">
        3D unavailable on this device
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage (shell + scene + HUD + ladder)                                 */
/* ------------------------------------------------------------------ */

export function OrderBookStage({ sim }: { sim: BookSim }) {
  const state = useBookSimState(sim);

  const renderScene = useCallback(
    (ctx: SceneContextValue) => (
      <OrderBookScene sim={sim} mobile={ctx.mobile} reduced={ctx.reduced} registerReset={ctx.registerReset} />
    ),
    [sim],
  );

  return (
    <SceneShell
      badge="Simulated microstructure view"
      heightClass="h-[400px] sm:h-[470px] lg:h-[540px] xl:h-[560px]"
      camera={{ fov: 40, position: [8.6, 5.4, 10.6] }}
      hud={<OrderBookHud state={state} />}
      overlay={
        <div className="absolute bottom-12 right-3 z-10 hidden sm:block">
          <LadderPanel state={state} />
        </div>
      }
      fallback={<BookFallback />}
      ariaLabel="Simulated three-dimensional limit order book with bid and ask depth evolving through event time. Presentational visualization only, not live market data."
      hint="Drag to rotate · scroll to zoom"
    >
      {renderScene}
    </SceneShell>
  );
}
