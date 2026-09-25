"use client";

/* eslint-disable react-hooks/immutability -- three.js scenes are imperative by design: buffers, matrices and uniforms are mutated inside useFrame/effects (never during React render). */

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SceneShell, type SceneContextValue } from "./scene-shell";

/* ------------------------------------------------------------------ */
/* GLSL — simplex noise + fbm terrain                                  */
/* ------------------------------------------------------------------ */

const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
    + i.y+vec4(0.0,i1.y,i2.y,1.0))
    + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f=0.0;
  f+=0.5333*snoise(p);
  f+=0.2667*snoise(p*2.03+11.7);
  f+=0.1333*snoise(p*4.01+27.3);
  return f;
}
`;

const VERT = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying float vHeight;
varying float vEnv;
${SIMPLEX}
void main(){
  vec2 xz = position.xz;
  float t = uTime;
  float n = fbm(vec3(xz.x*0.16, xz.y*0.24 - t*0.055, t*0.04));
  float r = 1.0 - abs(fbm(vec3(xz.x*0.11+5.0, xz.y*0.16+t*0.03, t*0.02+7.0)));
  float h = (0.60*n + 0.55*r*r - 0.24) * 2.35;
  float band = exp(-pow((xz.x + sin(xz.y*0.34 + t*0.07)*1.7)*0.17, 2.0));
  h += band * (0.45 + 0.55*n) * 1.05;
  float env = smoothstep(11.0, 8.6, abs(xz.x)) * smoothstep(5.7, 4.3, abs(xz.y));
  h = max(h, -0.4) * env;
  vec3 displaced = vec3(position.x, h, position.z);
  vHeight = h;
  vEnv = env;
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uFogColor;
varying vec3 vWorldPos;
varying float vHeight;
varying float vEnv;
void main(){
  vec3 dx = dFdx(vWorldPos);
  vec3 dy = dFdy(vWorldPos);
  vec3 n = normalize(cross(dx, dy));
  vec3 lightDir = normalize(vec3(0.55, 0.75, 0.35));
  float diff = clamp(dot(n, lightDir), 0.0, 1.0);
  vec3 cLow  = vec3(0.925, 0.943, 0.966);
  vec3 cMid  = vec3(0.705, 0.788, 0.898);
  vec3 cHigh = vec3(0.208, 0.386, 0.726);
  float hn = clamp((vHeight + 0.45) / 2.9, 0.0, 1.0);
  vec3 base = mix(cLow, cMid, smoothstep(0.0, 0.45, hn));
  base = mix(base, cHigh, smoothstep(0.42, 1.0, hn));
  vec3 color = base * (0.62 + diff * 0.52);
  vec2 grid = abs(fract(vWorldPos.xz + 0.5) - 0.5) / fwidth(vWorldPos.xz);
  float line = 1.0 - min(min(grid.x, grid.y), 1.0);
  color = mix(color, vec3(0.44, 0.54, 0.70), line * 0.16);
  float dist = length(vWorldPos - cameraPosition);
  float fog = 1.0 - exp(-pow(dist * 0.028, 2.1));
  color = mix(color, uFogColor, clamp(fog, 0.0, 0.68));
  float alpha = mix(1.0, 0.0, smoothstep(0.82, 1.0, 1.0 - vEnv));
  gl_FragColor = vec4(color, alpha);
}
`;

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

interface TerrainProps {
  reduced: boolean;
  registerReset: (fn: () => void) => void;
}

function TerrainScene({ registerReset }: TerrainProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const scanEdgeRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(22, 11, 130, 64);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uFogColor: { value: new THREE.Color("#f5f8fc") },
        },
        transparent: true,
      }),
    [],
  );

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    requestAnimationFrame(() => {
      controls.saveState();
      registerReset(() => controlsRef.current?.reset());
    });
  }, [registerReset]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    const cycle = 15;
    const progress = (state.clock.elapsedTime / cycle) % 1;
    const z = -4.9 + progress * 9.8;
    if (scanRef.current) {
      scanRef.current.position.z = z;
      const fade = Math.sin(Math.PI * progress);
      (scanRef.current.material as THREE.MeshBasicMaterial).opacity = 0.055 * fade;
    }
    if (scanEdgeRef.current) {
      scanEdgeRef.current.position.z = z;
      const fade = Math.sin(Math.PI * progress);
      (scanEdgeRef.current.material as THREE.MeshBasicMaterial).opacity = 0.32 * fade;
    }
  });

  return (
    <>
      <mesh geometry={geometry} material={material} />

      {/* Scanning "current book" slice */}
      <mesh ref={scanRef} position={[0, 1.5, 0]}>
        <planeGeometry args={[22, 3.4]} />
        <meshBasicMaterial color="#1d5be6" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={scanEdgeRef} position={[0, 3.2, 0]}>
        <boxGeometry args={[22, 0.025, 0.025]} />
        <meshBasicMaterial color="#1d5be6" transparent opacity={0.3} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.4, 0]}
        autoRotate
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={30}
        minPolarAngle={0.35}
        maxPolarAngle={1.42}
      />

      <TerrainLabels />
    </>
  );
}

function terrainLabelStyle(): React.CSSProperties {
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

function TerrainLabels() {
  return (
    <>
      <Html position={[9.2, 0.1, 5.9]} center zIndexRange={[0, 0]}>
        <div style={terrainLabelStyle()}>Price level →</div>
      </Html>
      <Html position={[-9.8, 0.1, -5.4]} center zIndexRange={[0, 0]}>
        <div style={terrainLabelStyle()}>← Event time</div>
      </Html>
      <Html position={[-10.3, 2.6, 1.2]} center zIndexRange={[0, 0]}>
        <div style={terrainLabelStyle()}>Elevation · depth</div>
      </Html>
      <Html position={[0, 3.55, 0]} center zIndexRange={[0, 0]}>
        <div style={{ ...terrainLabelStyle(), color: "#1d5be6", letterSpacing: "0.2em" }}>
          Current book slice
        </div>
      </Html>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Fallback + stage                                                     */
/* ------------------------------------------------------------------ */

function TerrainFallback() {
  return (
    <svg viewBox="0 0 320 170" className="w-[320px] max-w-full" role="img" aria-label="Static contour illustration of liquidity terrain">
      {[0.55, 0.42, 0.3, 0.2, 0.12].map((o, i) => (
        <path
          key={i}
          d={`M8 ${110 - i * 14} C 70 ${70 - i * 10}, 130 ${150 - i * 16}, 190 ${96 - i * 12} S 290 ${60 - i * 8}, 312 ${92 - i * 10}`}
          fill="none"
          stroke="#3e6fb8"
          strokeWidth={1.1}
          opacity={o}
        />
      ))}
      <line x1="8" y1="150" x2="312" y2="150" stroke="#c2cfe0" strokeWidth="1" />
      <text x="10" y="164" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.5">
        PRICE LEVEL
      </text>
      <text x="230" y="164" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.5">
        EVENT TIME
      </text>
      <text x="10" y="16" fontFamily="monospace" fontSize="8" fill="#64748b" letterSpacing="1.5">
        ELEVATION · DEPTH (3D UNAVAILABLE)
      </text>
    </svg>
  );
}

export function LiquidityTerrainStage() {
  const renderScene = useCallback(
    (ctx: SceneContextValue) => <TerrainScene reduced={ctx.reduced} registerReset={ctx.registerReset} />,
    [],
  );

  return (
    <SceneShell
      badge="Simulated liquidity field"
      heightClass="h-[420px] sm:h-[480px] lg:h-[540px]"
      camera={{ fov: 42, position: [11.5, 7.8, 13.2] }}
      fallback={<TerrainFallback />}
      ariaLabel="Three-dimensional liquidity landscape: price levels along one axis, event time along the other, elevation showing order-book depth. Simulated presentational view."
      hint="Drag to rotate · scroll to zoom · right-drag to pan"
    >
      {renderScene}
    </SceneShell>
  );
}
