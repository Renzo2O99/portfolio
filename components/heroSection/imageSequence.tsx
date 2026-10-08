import React, { use, useEffect } from "react";
import { gsap } from "gsap";

export function ImageSequence({
  sectionRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const canvas = document.getElementById(
      "hero-lightpass",
    ) as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    // const frameCount = 147;
    const SOURCE_FRAME_COUNT = 120;
    const FRAME_COUNT = 24;
    const MID_FRAME = Math.floor(FRAME_COUNT / 2);
    const frameCount = FRAME_COUNT;
    // const currentFrame = (index: number) =>
    //   `https://www.apple.com/105/media/us/airpods-pro/2019/1299e2f5_9206_4470_b28e_08307a42f19b/anim/sequence/large/01-hero-lightpass/${(index + 1).toString().padStart(4, "0")}.jpg`;
    const currentFrame = (index: number) =>
      `/modal_seq/${index.toString().padStart(3, "0")}.avif`;

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
      const frameIndex = Math.round(
        (i * (SOURCE_FRAME_COUNT - 1)) / (FRAME_COUNT - 1),
      );
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
      ? (cb: IdleRequestCallback) => window.requestIdleCallback(cb)
      : (cb: IdleRequestCallback) => window.setTimeout(() => cb({} as IdleDeadline), 1);

    const mid = images[MID_FRAME];
    if (mid.complete) {
      idle(reveal);
    } else {
      mid.addEventListener("load", () => idle(reveal));
    }

    let rafId: number;
    let targetFrame = MID_FRAME;
    let frameTween: gsap.core.Tween | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      if (!sectionRef.current || !isActive) return;
      const mousePositionX = event.clientX;
      const mappedX = gsap.utils.mapRange(
        0,
        sectionRef.current.offsetWidth,
        1,
        frameCount - 1,
        mousePositionX,
      );
      targetFrame = Math.round(mappedX);
    };

    const tick = () => {
      if (isActive && airpods.frame !== targetFrame) {
        frameTween?.kill();
        frameTween = gsap.to(airpods, {
          frame: targetFrame,
          snap: "frame",
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

    sectionElement.addEventListener("mousemove", handleMouseMove, {
      passive: true,
    });
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      frameTween?.kill();
      gsap.killTweensOf(airpods);
      visibility.disconnect();
      sectionElement.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // const { isActive } = useAppSelector((state) => state.splineReducer);
  return (
    <div className="contrast-110 absolute left-0 top-0 z-10 flex h-full w-full items-center justify-center grayscale">
      <canvas
        width={512}
        height={512}
        id="hero-lightpass"
        className="scale-[0.65] md:scale-[0.8] lg:scale-[1]"
      ></canvas>
    </div>
  );
}
