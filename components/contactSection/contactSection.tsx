import { Footer } from "@/components/contactSection/footer";
import React, { useRef } from "react";
import Magentic from "@/components/ui/magentic";
import { BgImagesContainer } from "@/components/contactSection/bgImagesContainer";
import { Header } from "../header";
import { Bulge } from "../bulge";
import { links } from "@/data/data";
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
