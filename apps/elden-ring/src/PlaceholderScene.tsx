import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Mesh } from "three";

function SpinningBox() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshToonMaterial color="#c9a227" />
    </mesh>
  );
}

export function PlaceholderScene() {
  return (
    <Canvas camera={{ position: [3, 2, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <SpinningBox />
      <OrbitControls />
    </Canvas>
  );
}
