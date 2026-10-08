"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FullpageNavContext } from "@/components/fullpageNavContext";

gsap.registerPlugin(CustomEase);

import SplitType from "split-type";

const ANCHORS = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;

type Anchor = (typeof ANCHORS)[number];
type SliceAnchor = Extract<Anchor, "first" | "second" | "third" | "fourth">;

const WHEEL_THRESHOLD = 40;
const TOUCH_THRESHOLD = 50;

const FullpageProvider = ({ children }: { children: React.ReactNode }) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const about = useRef<gsap.core.Timeline | null>(null);
  const textAnim__section2__down = useRef<gsap.core.Tween | null>(null);
  const work_heading = useRef<gsap.core.Tween | null>(null);
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const splitTypeInitialized = useRef(false);

  const ease = useMemo(
    () => CustomEase.create("custom", "M0,0 C0.52,0.01 0.16,1 1,1 "),
    [],
  );

  const scrollEase = useMemo(
    () => CustomEase.create("fullpage", "M0,0 C0.70,0 0.30,1 1,1"),
    [],
  );

  const animatedAnchors = useRef<Set<Anchor>>(new Set<Anchor>(["first"]));

  const handleSectionChange = useCallback(
    (anchor: Anchor, direction: "up" | "down") => {
      const isFirstTime = !animatedAnchors.current.has(anchor);
      if (isFirstTime) {
        animatedAnchors.current.add(anchor);
      }

      if (anchor === "second" || anchor === "fourth") {
        document.body.classList.add("darkGradient");
      } else {
        document.body.classList.remove("darkGradient");
      }

      if (anchor === "first" && direction === "up") {
        about.current?.seek(0.3);
      }

      if (anchor === "second") {
        if (direction === "down") {
          textAnim__section2__down.current?.restart(true);
          work_heading.current?.restart(true);
        } else {
          textAnim__section2__down.current?.restart();
        }
        if (videoElement.current) {
          videoElement.current.currentTime = 1.6;
          videoElement.current.play().catch(() => {});
        }
      }

      const flex = window.innerWidth > 540 ? 17 : 5;

      if (direction === "down") {
        gsap.fromTo(
          `.${anchor} .rounded__div__down`,
          { height: `${flex}vh` },
          {
            height: "0vh",
            duration: 1.2,
            ease,
          },
        );

        if (isFirstTime) {
          gsap.fromTo(
            `.${anchor} .anime`,
            { y: "30vh", opacity: 0 },
            { y: "0vh", opacity: 1, duration: 1.1, stagger: 0.03, ease },
          );
        }
      } else {
        gsap.fromTo(
          `.${anchor} .rounded__div__up`,
          { height: `${flex}vh` },
          {
            height: "0vh",
            duration: 1.2,
            ease,
          },
        );

        if (isFirstTime) {
          gsap.fromTo(
            `.${anchor} .anime`,
            { y: "-30vh", opacity: 0 },
            { y: "0vh", opacity: 1, duration: 1.1, stagger: -0.08, ease },
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      about.current = gsap
        .timeline({ defaults: { ease: "none" }, repeat: -1 })
        .fromTo(
          ".left .animate__this1",
          { y: "0%", opacity: 1 },
          { y: "-140%", opacity: 0, duration: 0.9, delay: 1.7, ease },
        )
        .fromTo(
          ".left .animate__this2",
          { y: "140%", opacity: 0 },
          { y: "0%", opacity: 1, duration: 0.9, ease },
          "-=0.9",
        )
        .fromTo(
          ".left .animate__this2",
          { y: "0%", opacity: 1 },
          { y: "-140%", opacity: 0, delay: 1.7, duration: 0.9, ease },
          "-=0.9",
        )
        .fromTo(
          ".left .animate__this1",
          { y: "140%", opacity: 0 },
          { y: "0%", opacity: 1, duration: 0.9, ease },
          "-=0.9",
        );
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            about.current?.play();
          } else {
            about.current?.pause();
          }
        });
      },
      { threshold: 0.1 },
    );

    const heroSection = document.querySelector(".section__1");
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => {
      observer.disconnect();
      ctx.revert();
    };
  }, [ease]);

  useEffect(() => {
    if (!splitTypeInitialized.current) {
      splitTypeInitialized.current = true;
      new SplitType("#my-text", { types: "lines" });
      new SplitType("#my-text .line", {
        types: "lines",
        lineClass: "innnerLine",
      });
    }

    textAnim__section2__down.current = gsap.from("#my-text .line .innnerLine", {
      duration: 1.5,
      y: "200%",
      opacity: 0,
      skewX: -10,
      paused: true,
      delay: 0.25,
      stagger: 0.12,
      ease: CustomEase.create("custom", "M0,0,C0.5,0,0,1,1,1"),
    });

    work_heading.current = gsap.fromTo(
      ".work_heading",
      { rotate: 15, scaleY: 1.5 },
      {
        rotate: 0,
        scaleY: 1,
        opacity: 1,
        delay: 0.7,
        duration: 1.3,
        ease: CustomEase.create("custom", "M0,0,C0.5,0,0,1,1,1"),
      },
    );

    videoElement.current = document.querySelector(
      "#video",
    ) as HTMLVideoElement;

    return () => {
      about.current?.kill();
    };
  }, []);

  const [current, setCurrent] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const currentRef = useRef(0);
  const lockedRef = useRef(false);
  let wheelAccum = 0;

  const sectionsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sections = Array.from(
      track.querySelectorAll<HTMLElement>(":scope > section"),
    );
    if (sections.length === 0) return;

    sectionsRef.current = sections;
    setTotalSections(sections.length);

    const getAnchor = (section: Element): Anchor =>
      (ANCHORS.find((anchor) => section.classList.contains(anchor)) ??
        "first") as Anchor;

    const total = sections.length;

    const goTo = (index: number, direction: "down" | "up") => {
      const next = Math.max(0, Math.min(total - 1, index));
      if (next === currentRef.current || lockedRef.current) return;

      lockedRef.current = true;
      currentRef.current = next;
      setCurrent(next);

      gsap.to(trackRef.current, {
        y: `-${next * 100}dvh`,
        duration: 0.9,
        ease: scrollEase,
        overwrite: true,
        onStart: () => {
          const nextAnchor = getAnchor(sections[next]);
          handleSectionChange(nextAnchor, direction);
        },
        onComplete: () => {
          setTimeout(() => {
            lockedRef.current = false;
            wheelAccum = 0;
          }, 600);
        },
      });
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (lockedRef.current) return;

      wheelAccum += event.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

      const activeIndex = currentRef.current;
      if (wheelAccum > 0) goTo(activeIndex + 1, "down");
      else goTo(activeIndex - 1, "up");

      wheelAccum = 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (lockedRef.current) return;
      const key = event.key;
      const activeIndex = currentRef.current;

      if (key === "ArrowDown" || key === "PageDown" || key === " ") {
        event.preventDefault();
        goTo(activeIndex + 1, "down");
      } else if (key === "ArrowUp" || key === "PageUp") {
        event.preventDefault();
        goTo(activeIndex - 1, "up");
      }
    };

    let touchStartY = 0;

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();

      if (lockedRef.current) return;

      const currentY = event.touches[0].clientY;
      const delta = touchStartY - currentY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;

      touchStartY = currentY;
      const activeIndex = currentRef.current;

      if (delta > 0) goTo(activeIndex + 1, "down");
      else goTo(activeIndex - 1, "up");
    };

    gsap.set(trackRef.current, { y: 0 });

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      gsap.killTweensOf(trackRef.current);
    };
  }, [handleSectionChange, scrollEase]);

  const navigateTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(sectionsRef.current.length - 1, index));
      if (next === currentRef.current || lockedRef.current) return;

      const direction = next > currentRef.current ? "down" : "up";
      lockedRef.current = true;
      currentRef.current = next;
      setCurrent(next);

      const total = sectionsRef.current.length;
      gsap.to(trackRef.current, {
        y: `-${next * 100}dvh`,
        duration: 0.9,
        ease: scrollEase,
        overwrite: true,
        onStart: () => {
          const section = sectionsRef.current[next];
          if (section) {
            const anchor = (ANCHORS.find((a) => section.classList.contains(a)) ??
              "first") as Anchor;
            handleSectionChange(anchor, direction);
          }
        },
        onComplete: () => {
          setTimeout(() => {
            lockedRef.current = false;
          }, 600);
        },
      });
    },
    [handleSectionChange, scrollEase],
  );

  const contextValue = useMemo(
    () => ({
      goTo: navigateTo,
      currentIndex: current,
      total: totalSections,
    }),
    [navigateTo, current, totalSections],
  );

  return (
    <FullpageNavContext.Provider value={contextValue}>
      <div className="sections-root">
        <div className="sections-track" ref={trackRef}>
          {children}
        </div>
      </div>
    </FullpageNavContext.Provider>
  );
};

export default FullpageProvider;