import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { HERO_TEXTS } from "../../lib/hero-texts.constants";
import { Postpro } from "./Postpro";
import { Scene } from "./Scene";

export function HeroModal() {
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
    <Canvas gl={{ antialias: false }} flat shadows camera={{ position: [0, 0, 8], fov: 35 }}>
      <ambientLight intensity={2} />
      <Scene position={[0, 0.1, 0]} scale={1.1} rotation={[0, 1.6 + mouseX * Math.PI, 0]} />
      <Postpro />
    </Canvas>
  );
}
