import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { getRandValues, shuffle } from "@/shared";
import { BackgroundImage } from "./BackgroundImage";

gsap.registerPlugin(CustomEase);

const backgroundImagesData = [
  { id: 1, imgLink: "/svg_logo/after-effects-logo.svg", title: "", subtitle: "" },
  { id: 2, imgLink: "/svg_logo/attributes-logo.svg", title: "", subtitle: "" },
  { id: 3, imgLink: "/svg_logo/client-first-logo.svg", title: "", subtitle: "" },
  { id: 4, imgLink: "/svg_logo/figma-logo.svg", title: "", subtitle: "" },
  { id: 5, imgLink: "/svg_logo/framer-logo.svg", title: "", subtitle: "" },
  { id: 6, imgLink: "/svg_logo/gsap-logo.svg", title: "", subtitle: "" },
  { id: 7, imgLink: "/svg_logo/mailchimp-logo.svg", title: "", subtitle: "" },
  { id: 8, imgLink: "/svg_logo/nextjs-logo.svg", title: "", subtitle: "" },
  { id: 9, imgLink: "/svg_logo/photoshop-logo.svg", title: "", subtitle: "" },
  { id: 10, imgLink: "/svg_logo/react-logo.svg", title: "", subtitle: "" },
  { id: 11, imgLink: "/svg_logo/spline-logo.svg", title: "", subtitle: "" },
  { id: 12, imgLink: "/svg_logo/rive-logo.svg", title: "", subtitle: "" },
  { id: 13, imgLink: "/svg_logo/typescript-logo.svg", title: "", subtitle: "" },
  { id: 14, imgLink: "/svg_logo/webflow-logo.svg", title: "", subtitle: "" },
];

const mobilePositions = [
  { left: 16, top: 16, rotate: -12 },
  { left: 84, top: 15, rotate: 14 },
  { left: 54, top: 13, rotate: -6 },
  { left: 12, top: 31, rotate: 10 },
  { left: 36, top: 25, rotate: -8 },
  { left: 88, top: 29, rotate: -14 },
  { left: 68, top: 24, rotate: 12 },
  { left: 8, top: 49, rotate: -10 },
  { left: 92, top: 47, rotate: 8 },
  { left: 14, top: 67, rotate: 14 },
  { left: 34, top: 73, rotate: -12 },
  { left: 86, top: 65, rotate: -10 },
  { left: 66, top: 71, rotate: 10 },
  { left: 50, top: 83, rotate: -4 },
];

function getRandDistributedTop(index: number, targets: { length: number }) {
  const mid = Math.floor(targets.length / 2);
  if (index === 0) return 65;
  if (index === targets.length - 1) return 35;
  if (index === mid) return 50;
  if (index < mid) return getRandValues(30, 60);
  if (index > mid) return getRandValues(40, 70);
  return getRandValues(30, 70);
}

type BackgroundImagesProps = {
  backgroundImagesSharedRef: MutableRefObject<gsap.core.Tween | null>;
};

export const BackgroundImages = ({ backgroundImagesSharedRef }: BackgroundImagesProps) => {
  // NOTE: orden estable en el primer render (SSR = cliente) para evitar hydration
  // mismatch: Math.random() difiere entre servidor y cliente. El shuffle ocurre
  // solo en cliente post-hidratación, antes de que la animación sea visible
  // (los tweens arrancan en pausa y juegan al intersectar la sección).
  const [shuffledImages, setShuffledImages] = useState(() => backgroundImagesData);

  useEffect(() => {
    setShuffledImages(shuffle([...backgroundImagesData]));
  }, []);
  const backgroundImagesTween = useRef<gsap.core.Tween | null>(null);
  const GAP = 6;

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      backgroundImagesTween.current = gsap.fromTo(
        ".backgroundImages",
        { y: "200%", x: "0%", left: "50%", rotate: 0, top: "50%" },
        {
          y: "-50%",
          x: "0%",
          left: (index) => `${90 + index * -GAP}%`,
          top: (index, _, targets) => `${getRandDistributedTop(index, targets)}%`,
          rotate: () => getRandValues(-30, 30),
          paused: true,
          delay: 0.8,
          stagger: 0.08,
          duration: 1,
          ease: CustomEase.create("custom", "M0,0,C0.5,0,0,1,1,1"),
        },
      );
    });

    mm.add("(max-width: 767px)", () => {
      backgroundImagesTween.current = gsap.fromTo(
        ".backgroundImages",
        { y: "200%", x: "0%", left: "50%", rotate: 0, top: "50%" },
        {
          y: "-50%",
          x: "0%",
          left: (index) => `${mobilePositions[index % mobilePositions.length]?.left ?? 50}%`,
          top: (index) => `${mobilePositions[index % mobilePositions.length]?.top ?? 50}%`,
          rotate: (index) => mobilePositions[index % mobilePositions.length]?.rotate ?? 0,
          paused: true,
          delay: 0.8,
          stagger: 0.06,
          duration: 0.9,
          ease: CustomEase.create("custom", "M0,0,C0.5,0,0,1,1,1"),
        },
      );
    });

    backgroundImagesSharedRef.current = gsap.fromTo(
      ".footer__img_wrapper",
      { minWidth: "100%", minHeight: "100%" },
      {
        minWidth: "110%",
        minHeight: "150%",
        paused: true,
        delay: 0.1,
        duration: 0.6,
        ease: CustomEase.create("custom", "M0,0,C0.5,0,0,1,1,1"),
      },
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            backgroundImagesTween.current?.play();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    const section = document.querySelector(".section__5");
    if (section) {
      observer.observe(section);
    }

    return () => {
      mm.revert();
      backgroundImagesTween.current?.kill();
      backgroundImagesSharedRef.current?.kill();
      observer.disconnect();
    };
  }, [backgroundImagesSharedRef]);

  return (
    <div className="footer__img_wrapper bg-transparent-foreground !absolute flex h-[100%] w-[100%] items-center justify-center overflow-hidden">
      {shuffledImages.map((item, index) => (
        <BackgroundImage key={item.id} total={backgroundImagesData.length} imageItem={item} index={index} />
      ))}
    </div>
  );
};
