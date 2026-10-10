import { useRef } from "react";
import { RoundedSlideTransition, Header, MagneticLink } from "@/common";
import { links } from "@/shared";
import { CONTACT_TEXTS } from "../../lib/contact-texts.constants";
import { BackgroundImages } from "../parts/BackgroundImages";
import { Footer } from "../parts/Footer";

export function ContactSection() {
  const backgroundImagesSharedRef = useRef<gsap.core.Tween | null>(null);

  return (
    <section className="section section__5 third darkGradient">
      <RoundedSlideTransition type="Light" />
      <Header color="Light" />

      <MagneticLink
        href={links.contact}
        className="footer__heading anime cursor-pointer"
        scrambleParams={{
          text: CONTACT_TEXTS.TITLE_CONTACT,
        }}
        onMouseEnter={() => {
          backgroundImagesSharedRef.current?.play();
        }}
        onMouseLeave={() => {
          backgroundImagesSharedRef.current?.reverse();
        }}
      >
        <span className="shapka mask">
          <span className="scrambleText inline-block text-left">{CONTACT_TEXTS.TITLE_CONTACT}</span>
          <span className="yellow__it">.</span>
        </span>
      </MagneticLink>
      <BackgroundImages backgroundImagesSharedRef={backgroundImagesSharedRef} />
      <Footer />
    </section>
  );
}
