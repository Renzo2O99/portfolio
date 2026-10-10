import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { HERO_TEXTS } from "../../lib/hero-texts.constants";

function HeroShape({ mouseX }: { mouseX: number }) {
  const groupRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    // NOTE: rotación continua + parallax de mouse (rango -0.5 a 0.5).
    group.rotation.y += delta * 0.25 + mouseX * 0.02;
    group.rotation.x += delta * 0.1;
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]} scale={1.1}>
      <mesh>
        <torusKnotGeometry args={[1.4, 0.4, 128, 24]} />
        <meshStandardMaterial color="#8a8a8a" wireframe />
      </mesh>
    </group>
  );
}

export function HeroCanvas() {
  const [mouseX, setMouseX] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // NOTE: Normaliza la posición del mouse en rango -0.5 a 0.5
      setMouseX(e.clientX / window.innerWidth - 0.5);
    };

    window.addEventListener(HERO_TEXTS.EVENT_MOUSEMOVE, handleMouseMove);
    return () => window.removeEventListener(HERO_TEXTS.EVENT_MOUSEMOVE, handleMouseMove);
  }, []);

  return (
    <Canvas gl={{ antialias: true }} flat shadows camera={{ position: [0, 0, 8], fov: 35 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <HeroShape mouseX={mouseX} />
    </Canvas>
  );
}
