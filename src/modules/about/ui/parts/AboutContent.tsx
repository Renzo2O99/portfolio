import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { MagneticLink } from "@/common";
import { isDesktop, links } from "@/shared";
import { ABOUT_TEXTS } from "../../lib/about-texts.constants";

export function AboutContent() {
  const [text, setText] = useState<{ main: string; para: string }>({
    main: ABOUT_TEXTS.TITLE_FEATURED_WORK,
    para: ABOUT_TEXTS.PARA_DESKTOP,
  });

  useEffect(() => {
    if (!isDesktop()) {
      setText({
        main: ABOUT_TEXTS.TITLE_RECENT_WORK,
        para: ABOUT_TEXTS.PARA_MOBILE,
      });
    }
  }, []);

  return (
    <main className="flex h-full w-full max-w-maxWidth grow flex-col justify-center text-[5.8vw] md:text-[clamp(20px,_1vw_+_14px,_32px)]">
      <div className="anime relative flex flex-col gap-[1em] md:flex-row-reverse md:gap-[2em]">
        <p id="my-text" className="text-left leading-[1.3] text-colorSecondaryDark md:w-[100%]">
          {text.para}
        </p>
        <MagneticLink
          href={links.work}
          scrambleParams={{
            text: ABOUT_TEXTS.BTN_VIEW_ALL_WORK,
          }}
          onMouseEnter={() => {
            if (isDesktop()) {
              // NOTE: valores de tema hardcodeados (Lens 22, no Lens 05).
              // No centralizar en ABOUT_TEXTS: son tokens CSS, no copy UI.
              gsap.to("body", {
                "--colorLight": "#0e0d0c",
                "--colorDark": "#fff",
                "--colorSecondaryDark": "#bfbfbf",
                "--colorSecondaryLight": "#404040",
                "--colorSecondaryHalfLight": "#1a1a1a",
                "--colorSecondaryHalfDark": "#f2f2f2",
                "--colorWhite": "#000",
              });
            }
          }}
          onMouseLeave={() => {
            if (isDesktop()) {
              // NOTE: ver onMouseEnter — tokens de tema, fuera del alcance de Lens 05.
              gsap.to("body", {
                "--colorLight": "#fff",
                "--colorDark": "#0e0d0c",
                "--colorSecondaryDark": "#404040",
                "--colorSecondaryLight": "#bfbfbf",
                "--colorSecondaryHalfLight": "#f2f2f2",
                "--colorSecondaryHalfDark": "#1a1a1a",
                "--colorWhite": "#fff",
              });
            }
          }}
          className="group h-full items-center justify-center rounded-2xl bg-colorDark p-3 md:relative md:min-h-full md:w-[33%] md:rounded-full"
        >
          <p className="shapka !flex text-[0.9em] text-colorLight md:text-[0.7em]">
            <span className="scrambleText whitespace-nowrap">{ABOUT_TEXTS.BTN_VIEW_ALL_WORK}</span>
            <ArrowUpRight className="ml-2 inline h-[1.1em] w-[1.1em] self-center text-colorLight" aria-hidden="true" />
          </p>
        </MagneticLink>
      </div>

      <div className="customBorder anime mx-auto my-[1.5em] h-[2px] w-[calc(100%_-_20px)] self-start rounded-full bg-colorSecondaryLight opacity-30" />

      <a href={links.work} className="anime relative flex h-[260px] w-full items-center justify-center md:h-[380px]">
        <div className="flex flex-col items-center justify-center">
          <div>
            <h2 className="work_heading mask">{text.main}</h2>
          </div>
        </div>
        <div className="section3__video overflow-hidden rounded-3xl bg-black">
          <video
            className=""
            id="video"
            playsInline
            preload="metadata"
            muted
            loop
            src="/video/transcode.mp4"
            onCanPlay={(e) => {
              const video = e.currentTarget;
              if (video instanceof HTMLVideoElement) {
                video.play().catch(() => {});
              }
            }}
          />
        </div>
      </a>
    </main>
  );
}
