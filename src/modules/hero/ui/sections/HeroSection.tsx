import React, { useRef } from "react";

import { HeroWrapper } from "../parts/HeroWrapper";
import { Header } from "@/common/ui/parts/Header";
import { Bulge } from "@/common/ui/parts/Bulge";
import { ImageSequence } from "../parts/ImageSequence";

export function HeroSection({}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  return (
    <section
      ref={sectionRef}
      className="section section__1 darkGradient first relative z-0 px-paddingX text-colorLight"
    >
      <Bulge type="Light" />
      <Header color="Light" />
      <HeroWrapper />
      <ImageSequence sectionRef={sectionRef} />
    </section>
  );
}
