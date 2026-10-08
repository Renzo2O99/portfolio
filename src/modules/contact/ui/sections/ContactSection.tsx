import { Footer } from "../parts/Footer";
import React, { useRef } from "react";
import Magentic from "@/common/ui/parts/Magentic";
import { BgImagesContainer } from "../parts/BgImagesContainer";
import { Header } from "@/common/ui/parts/Header";
import { Bulge } from "@/common/ui/parts/Bulge";
import { links } from "@/shared/data/data";
export function ContactSection({}) {
  const bgImagesSharedRef = useRef<gsap.core.Tween | null>(null);

  return (
    <section className="section section__5 third darkGradient ">
      <Bulge type="Light" />
      <Header color="Light"></Header>

      <Magentic // href="mailto:email.coex@gmail.com"
        href={links.contact}
        className="footer__heading anime cursor-pointer"
        scrambleParams={{
          text: "Contact",
        }}
        onMouseEnter={() => {
          bgImagesSharedRef.current?.play();
        }}
        onMouseLeave={() => {
          bgImagesSharedRef.current?.reverse();
        }}
      >
        <span className="shapka mask">
          <span className="scrambleText inline-block text-left">Contact</span>
          <span className="yellow__it">.</span>
        </span>
      </Magentic>
      <BgImagesContainer bgImagesSharedRef={bgImagesSharedRef} />
      <Footer />
    </section>
  );
}
