"use client";

import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { TerrainScene } from "./TerrainScene";

/** The WebGL canvas. Loaded lazily (ssr:false) by Hero to keep it off the critical path. */
export default function HeroCanvas({
  scroll,
}: {
  scroll?: MotionValue<number>;
}) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      }}
      camera={{ position: [0, 46, 70], fov: 50, near: 0.1, far: 220 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#05070e"]} />
      <TerrainScene scroll={scroll} />
    </Canvas>
  );
}
