"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";

const FOG_COLOR = "#05070e";

/* ---------- procedural terrain ---------- */
function fbm(x: number, y: number): number {
  // Cheap ridged sum-of-sines terrain (no noise lib needed).
  let h = 0;
  h += Math.sin(x * 0.18) * Math.cos(y * 0.16) * 3.2;
  h += Math.sin(x * 0.09 + 1.7) * Math.cos(y * 0.11 + 0.4) * 5.0;
  h += Math.sin(x * 0.33 + y * 0.21) * 1.4;
  h += Math.cos(x * 0.5 - y * 0.35) * 0.7;
  // ridge accent
  h += (1.0 - Math.abs(Math.sin(x * 0.14 + y * 0.05))) * 2.4;
  return h;
}

const VERT = /* glsl */ `
  #include <fog_pars_vertex>
  varying float vElev;
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vElev = position.z;
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    #include <fog_vertex>
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uContour;
  uniform vec3 uScan;
  uniform vec3 uLightDir;
  uniform float uMinH;
  uniform float uMaxH;
  varying float vElev;
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    float h = clamp((vElev - uMinH) / (uMaxH - uMinH), 0.0, 1.0);
    vec3 base = mix(uLow, uHigh, pow(h, 1.25));

    float diff = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
    base *= 0.42 + 0.78 * diff;

    // elevation contour lines
    float e = vElev * 1.15;
    float d = abs(fract(e) - 0.5);
    float line = smoothstep(0.46, 0.5, d);
    base += uContour * line * (0.22 + 0.55 * h);

    // moving radial data pulse from the center
    float r = length(vPos.xy);
    float pulse = sin(r * 0.35 - uTime * 1.1);
    float ring = smoothstep(0.9, 1.0, pulse);
    base += uScan * ring * 0.12;

    gl_FragColor = vec4(base, 1.0);
    #include <fog_fragment>
  }
`;

function Terrain({ scroll }: { scroll?: MotionValue<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const size = 120;
    const seg = 180;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = fbm(x, y);
      pos.setZ(i, z);
      if (z < min) min = z;
      if (z > max) max = z;
    }
    geo.computeVertexNormals();
    geo.userData.min = min;
    geo.userData.max = max;
    return geo;
  }, []);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uLow: { value: new THREE.Color("#0a1526") },
          uHigh: { value: new THREE.Color("#2bd4ee") },
          uContour: { value: new THREE.Color("#3ea6ff") },
          uScan: { value: new THREE.Color("#7dd3fc") },
          uLightDir: { value: new THREE.Vector3(0.4, 0.9, 0.5) },
          uMinH: { value: (geometry.userData.min as number) ?? -6 },
          uMaxH: { value: (geometry.userData.max as number) ?? 10 },
        },
      ]),
    [geometry],
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    // gentle scroll-linked descent of the terrain
    if (meshRef.current && scroll) {
      const p = scroll.get();
      meshRef.current.position.y = -8 - p * 6;
      meshRef.current.rotation.z = p * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -8, 0]}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        fog
      />
    </mesh>
  );
}

/* ---------- atmospheric particles ---------- */
function Particles({ count = 380 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 1] = Math.random() * 40 - 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * 0.9;
      if (y > 40) y = -2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.22}
        color="#8ad5f0"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ---------- camera rig ---------- */
function CameraRig({ scroll }: { scroll?: MotionValue<number> }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime;
    const intro = Math.min(1, (t - start.current) / 2.4);
    const eased = 1 - Math.pow(1 - intro, 3); // easeOutCubic

    const p = scroll ? scroll.get() : 0;
    const px = state.pointer.x;
    const py = state.pointer.y;

    // base orbit + scroll dolly + pointer parallax, blended in on entrance
    const baseY = 14 - eased * 0 + Math.sin(t * 0.12) * 0.6;
    const introY = 46; // start high & far
    const camY = THREE.MathUtils.lerp(introY, baseY + p * 5, eased);

    const baseZ = 34 + Math.cos(t * 0.1) * 1.2;
    const introZ = 70;
    const camZ = THREE.MathUtils.lerp(introZ, baseZ - p * 8, eased);

    const camX = Math.sin(t * 0.08) * 2.2 + px * 4 * eased;

    camera.position.set(camX, camY + py * 2 * eased, camZ);
    target.set(px * 2 * eased, 2 - p * 3, 0);
    camera.lookAt(target);
  });

  return null;
}

export function TerrainScene({ scroll }: { scroll?: MotionValue<number> }) {
  return (
    <>
      <fog attach="fog" args={[FOG_COLOR, 34, 96]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 20, 12]} intensity={1.1} color="#bfe9ff" />
      <pointLight position={[-16, 8, -10]} intensity={40} color="#22d3ee" distance={80} />
      <Terrain scroll={scroll} />
      <Particles />
      <CameraRig scroll={scroll} />
    </>
  );
}
