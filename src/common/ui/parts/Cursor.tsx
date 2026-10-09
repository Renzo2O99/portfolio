import { gsap } from "gsap";
import { useEffect } from "react";

export function Cursor() {
  useEffect(() => {
    const xTo = gsap.quickTo(".cursor1", "x", {
      duration: 0.15,
      ease: "power3",
    });
    const yTo = gsap.quickTo(".cursor1", "y", {
      duration: 0.15,
      ease: "power3",
    });
    const xTo2 = gsap.quickTo(".cursor2", "x", {
      duration: 0.4,
      ease: "power3",
    });
    const yTo2 = gsap.quickTo(".cursor2", "y", {
      duration: 0.4,
      ease: "power3",
    });

    let rafId: number | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      xTo(mouseX);
      yTo(mouseY);
      xTo2(mouseX);
      yTo2(mouseY);
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    function handleMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      start();

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(stop, 200);
    }

    document.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMove);
      if (idleTimer) clearTimeout(idleTimer);
      stop();
    };
  }, []);

  return (
    <>
      <div className="cursor cursor1"></div>
      <div className="cursor cursor2"></div>
    </>
  );
}
