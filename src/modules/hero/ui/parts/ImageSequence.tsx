import { gsap } from "gsap";
import { useEffect } from "react";
import { HERO_TEXTS } from "../../lib/hero-texts.constants";
import type { ImageSequenceProps } from "../../models/hero.types";

export function ImageSequence({ sectionRef }: ImageSequenceProps) {
  useEffect(() => {
    const element = document.getElementById("hero-lightpass");
    if (!(element instanceof HTMLCanvasElement)) return;
    const canvas = element;
    const context = canvas.getContext("2d");
    const SOURCE_FRAME_COUNT = 120;
    const FRAME_COUNT = 24;
    const MID_FRAME = Math.floor(FRAME_COUNT / 2);
    const frameCount = FRAME_COUNT;
    const currentFrame = (index: number) => `/modal_seq/${index.toString().padStart(3, "0")}.avif`;

    const images: HTMLImageElement[] = [];
    let isActive = true;
    const airpods = {
      frame: MID_FRAME,
    };

    function render() {
      const img = images[airpods.frame];
      if (!isActive || !img?.complete || !img.naturalWidth) return;
      context?.clearRect(0, 0, canvas.width, canvas.height);
      context?.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < FRAME_COUNT; i++) {
      const frameIndex = Math.round((i * (SOURCE_FRAME_COUNT - 1)) / (FRAME_COUNT - 1));
      const img = new Image();
      img.src = currentFrame(frameIndex);
      images.push(img);
    }

    function reveal() {
      render();
      images.forEach((img) => {
        if (img.decode) void img.decode().catch(() => {});
      });
    }

    if (!sectionRef.current) return;

    const idle = window.requestIdleCallback
      ? (callback: IdleRequestCallback) => window.requestIdleCallback(callback)
      : (callback: IdleRequestCallback) => {
          const fallbackDeadline: IdleDeadline = {
            didTimeout: false,
            timeRemaining: () => 0,
          };
          return window.setTimeout(() => callback(fallbackDeadline), 1);
        };

    const mid = images[MID_FRAME];
    if (mid.complete) {
      idle(reveal);
    } else {
      mid.addEventListener(HERO_TEXTS.EVENT_LOAD, () => idle(reveal));
    }

    let rafId: number;
    let targetFrame = MID_FRAME;
    let frameTween: gsap.core.Tween | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      if (!sectionRef.current || !isActive) return;
      const mousePositionX = event.clientX;
      const mappedX = gsap.utils.mapRange(0, sectionRef.current.offsetWidth, 1, frameCount - 1, mousePositionX);
      targetFrame = Math.round(mappedX);
    };

    const tick = () => {
      if (isActive && airpods.frame !== targetFrame) {
        frameTween?.kill();
        frameTween = gsap.to(airpods, {
          frame: targetFrame,
          snap: HERO_TEXTS.SNAP_FRAME,
          ease: "none",
          duration: 0.2,
          overwrite: true,
          onUpdate: render,
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    const sectionElement = sectionRef.current;

    const visibility = new IntersectionObserver(
      ([entry]) => {
        isActive = entry.isIntersecting;

        if (isActive) {
          render();
        } else {
          frameTween?.kill();
          frameTween = null;
          airpods.frame = targetFrame;
        }
      },
      { threshold: 0 },
    );
    visibility.observe(sectionElement);

    sectionElement.addEventListener(HERO_TEXTS.EVENT_MOUSEMOVE, handleMouseMove, {
      passive: true,
    });
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      frameTween?.kill();
      gsap.killTweensOf(airpods);
      visibility.disconnect();
      sectionElement.removeEventListener(HERO_TEXTS.EVENT_MOUSEMOVE, handleMouseMove);
    };
  }, [sectionRef]);

  return (
    <div className="contrast-110 absolute left-0 top-0 z-10 flex h-full w-full items-center justify-center grayscale">
      <canvas width={512} height={512} id="hero-lightpass" className="scale-[0.65] md:scale-[0.8] lg:scale-[1]" />
    </div>
  );
}
