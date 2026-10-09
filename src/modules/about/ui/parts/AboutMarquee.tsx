import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { useEffect } from "react";

gsap.registerPlugin(CustomEase);

import FigmaIcon from "@/public/svg/figmaIcon.svg";
import Framer from "@/public/svg/framer.svg";
import GitIcon from "@/public/svg/gitIcon.svg";
import NextIcon from "@/public/svg/nextjsIcon.svg";
import NodejsIcon from "@/public/svg/nodejsIcon.svg";
import ReactIcon from "@/public/svg/reactIcon.svg";
import TailwindIcon from "@/public/svg/tailwindIcon.svg";
import TypescriptIcon from "@/public/svg/typescriptIcon.svg";
import Webflow from "@/public/svg/webflow.svg";
import { cn } from "@/shared";

export function AboutMarquee() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const el = document.querySelector(".rollingText3");
      if (el instanceof HTMLElement) {
        gsap.set(`.rollingText3`, {
          left: `${el.offsetWidth}px`,
        });
      }

      // NOTE: "custom" y el path M0,0,... son config de GSAP CustomEase,
      // no copy UI. Excluidos en Lens 05 (ver lens-05-strings.mjs).
      gsap.fromTo(
        `.rollingText2`,
        {
          xPercent: 0,
        },
        {
          xPercent: -100,
          duration: 20,
          ease: CustomEase.create("custom", "M0,0,C0,0,1,1,1,1"),
          repeat: -1,
        },
      );

      gsap.fromTo(
        `.rollingText3`,
        {
          xPercent: 0,
        },
        {
          xPercent: -100,
          duration: 20,
          ease: CustomEase.create("custom", "M0,0,C0,0,1,1,1,1"),
          repeat: -1,
        },
      );
    });

    return () => ctx.revert();
  }, []);
  return (
    <div id="one" className="anime mt-[2em] grow rounded-3xl bg-colorSecondaryHalfLight md:mt-[4em] md:rounded-(--radius)">
      <div className="slider_wip">
        <InnerMarquee className="rollingText2" />
        <InnerMarquee className="rollingText3" />
      </div>
    </div>
  );
}

type InnerMarqueeProps = {
  className?: string;
};

export const InnerMarquee = ({ className }: InnerMarqueeProps) => {
  return (
    <div className={cn("slider-inner slider ", className)}>
      <div className="img-wrapper">
        <NextIcon />
      </div>
      <div className="img-wrapper">
        <TailwindIcon />
      </div>
      <div className="img-wrapper">
        <TypescriptIcon className="h-[90%]" />
      </div>
      <div className="img-wrapper">
        <ReactIcon />
      </div>
      <div className="img-wrapper">
        <NodejsIcon />
      </div>
      <div className="img-wrapper">
        <FigmaIcon />
      </div>
      <div className="img-wrapper">
        <GitIcon />
      </div>
      <div className="img-wrapper">
        <Webflow />
      </div>
      <div className="img-wrapper">
        <Framer />
      </div>
    </div>
  );
};
