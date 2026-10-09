import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Object3DProps } from "../../models/hero.types";

export function Scene(props: Object3DProps) {
  const gltf = useLoader(GLTFLoader, "/3d/statue.glb");
  return (
    <primitive object={gltf.scene} {...props}>
      <meshStandardMaterial color="#353535" />
    </primitive>
  );
}
