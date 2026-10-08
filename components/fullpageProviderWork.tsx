"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FullpageNavContext } from "@/components/fullpageNavContext";

gsap.registerPlugin(CustomEase);

const WHEEL_THRESHOLD = 40;
const TOUCH_THRESHOLD = 50;

const FullpageProviderWork = ({
  children,
  overlay,
  onSectionChange,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  onSectionChange?: (index: number) => void;
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const navigateRef = useRef<(index: number) => void>(() => {});
  const onSectionChangeRef = useRef(onSectionChange);
  onSectionChangeRef.current = onSectionChange;

  const [current, setCurrent] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const currentRef = useRef(0);
  const lockedRef = useRef(false);
  const sectionsRef = useRef<HTMLElement[]>([]);
  let wheelAccum = 0;

  const navigateTo = useCallback((index: number) => {
    navigateRef.current(index);
  }, []);

  const ease = useMemo(
    () => CustomEase.create("custom", "M0,0 C0.52,0.01 0.16,1 1,1 "),
    [],
  );

  const scrollEase = useMemo(
    () => CustomEase.create("fullpage", "M0,0 C0.70,0 0.30,1 1,1"),
    [],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sections = Array.from(
      track.querySelectorAll<HTMLElement>(".section"),
    );
    if (sections.length === 0) return;

    sectionsRef.current = sections;
    setTotalSections(sections.length);

    const total = sectionsRef.current.length;
    const yPercentFor = (index: number) => -(index / total) * 100;

    const animateSection = (index: number, direction: "up" | "down") => {
      const target = `.s${index}`;
      const flex = window.innerWidth > 540 ? 17 : 5;

      if (direction === "down") {
        gsap.fromTo(
          `${target} .anime`,
          { y: "30vh" },
          { y: "0vh", duration: 1.1, stagger: 0.03, ease },
        );

        gsap.fromTo(
          `${target} .rounded__div__down`,
          { height: `${flex}vh` },
          { height: "0vh", duration: 1.2, ease },
        );
      } else {
        gsap.fromTo(
          `${target} .anime`,
          { y: "-30vh" },
          { y: "0vh", duration: 1.1, stagger: -0.03, ease },
        );

        gsap.fromTo(
          `${target} .rounded__div__up`,
          { height: `${flex}vh` },
          { height: "0vh", duration: 1.2, ease },
        );
      }
    };

    const goTo = (index: number, direction: "up" | "down") => {
      const next = Math.max(0, Math.min(total - 1, index));
      if (next === currentRef.current || lockedRef.current) return;

      lockedRef.current = true;
      currentRef.current = next;
      setCurrent(next);

      gsap.to(track, {
        yPercent: yPercentFor(next),
        duration: 0.9,
        ease: scrollEase,
        overwrite: true,
        onStart: () => {
          animateSection(next, direction);
          onSectionChangeRef.current?.(next);
        },
        onComplete: () => {
          lockedRef.current = false;
        },
      });
    };

    navigateRef.current = (index: number) => {
      const next = Math.max(0, Math.min(total - 1, index));
      if (next === currentRef.current || lockedRef.current) return;

      const direction = next > currentRef.current ? "down" : "up";
      goTo(next, direction);
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

    gsap.set(track, { yPercent: yPercentFor(0) });

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      gsap.killTweensOf(track);
    };
  }, [ease, scrollEase]);

  return (
    <FullpageNavContext.Provider
      value={{ goTo: navigateTo, currentIndex: current, total: totalSections }}
    >
      <div className="sections-root">
        <div className="sections-track" ref={trackRef}>
          {children}
        </div>
        {overlay}
      </div>
    </FullpageNavContext.Provider>
  );
};

export default FullpageProviderWork;
