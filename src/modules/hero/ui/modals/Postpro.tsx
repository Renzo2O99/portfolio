import { Bloom, EffectComposer } from "@react-three/postprocessing";

export function Postpro() {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.1} intensity={2} />
    </EffectComposer>
  );
}
