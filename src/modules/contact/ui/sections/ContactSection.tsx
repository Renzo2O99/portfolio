import { useRef } from "react";
import { Bulge, Header, Magentic } from "@/common";
import { links } from "@/shared";
import { CONTACT_TEXTS } from "../../lib/contact-texts.constants";
import { BgImagesContainer } from "../parts/BgImagesContainer";
import { Footer } from "../parts/Footer";

export function ContactSection() {
  const bgImagesSharedRef = useRef<gsap.core.Tween | null>(null);

  return (
    <section className="section section__5 third darkGradient">
      <Bulge type="Light" />
      <Header color="Light" />

      <Magentic
        href={links.contact}
        className="footer__heading anime cursor-pointer"
        scrambleParams={{
          text: CONTACT_TEXTS.TITLE_CONTACT,
        }}
        onMouseEnter={() => {
          bgImagesSharedRef.current?.play();
        }}
        onMouseLeave={() => {
          bgImagesSharedRef.current?.reverse();
        }}
      >
        <span className="shapka mask">
          <span className="scrambleText inline-block text-left">{CONTACT_TEXTS.TITLE_CONTACT}</span>
          <span className="yellow__it">.</span>
        </span>
      </Magentic>
      <BgImagesContainer bgImagesSharedRef={bgImagesSharedRef} />
      <Footer />
    </section>
  );
}
