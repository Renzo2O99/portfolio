import { HERO_TEXTS } from "../../lib/hero-texts.constants";
import { LatestWorkCta } from "./LatestWorkCta";
import { HeroMarquee } from "./HeroMarquee";

export function HeroContent() {
  return (
    <main className="section1__wrapper relative max-w-maxWidth grow">
      <div className="myImage" />
      <LatestWorkCta />
      <h2 className="left mask pointer-events-none z-20 pt-20">
        <div className="free anime">{HERO_TEXTS.LABEL_FREELANCE}</div>
        <div className="animation__wrapper anime relative h-[1.2em] overflow-hidden">
          <span className="animate__this animate__this1 left-0">
            {HERO_TEXTS.ROLE_WEBFLOW}
            <span className="yellow__it">.</span>
          </span>
          <span className="animate__this animate__this2 left-0">
            {HERO_TEXTS.ROLE_NEXTJS}
            <span className="yellow__it">.</span>
          </span>
        </div>
      </h2>
      <HeroMarquee />
    </main>
  );
}
