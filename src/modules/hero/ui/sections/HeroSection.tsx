import { useRef } from "react";
import { Bulge, Header } from "@/common";
import { HeroWrapper } from "../parts/HeroWrapper";
import { ImageSequence } from "../parts/ImageSequence";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  return (
    <section ref={sectionRef} className="section section__1 darkGradient first relative z-0 px-paddingX text-colorLight">
      <Bulge type="Light" />
      <Header color="Light" />
      <HeroWrapper />
      <ImageSequence sectionRef={sectionRef} />
    </section>
  );
}
