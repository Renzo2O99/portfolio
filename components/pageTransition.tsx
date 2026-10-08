"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { isDesktop } from "@/lib/utils";

gsap.registerPlugin(CustomEase);

const DURATION = 0.75;
const INTERNAL_LINK = 'a[href^="/"]';
const ease = CustomEase.create("custom", "M0,0 C0.52,0.01 0.16,1 1,1 ");

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);

  const busy = useRef(false);
  const previous = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearRescueTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    const el = panelRef.current;
    const wave = waveRef.current;
    if (!el) return;

    const isFirst = previous.current === null;
    const changed = previous.current !== pathname;
    previous.current = pathname;

    clearRescueTimeout();
    gsap.killTweensOf(el);
    if (wave) gsap.killTweensOf(wave);

    if (isFirst) {
      gsap.set(el, { yPercent: -100, y: 0, force3D: true });
      if (wave) gsap.set(wave, { height: "0vh", force3D: true });
      return;
    }

    if (!changed) {
      busy.current = false;
      return;
    }

    const flexHeight = isDesktop() ? "20vh" : "7vh";
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });

    tl.set(el, { yPercent: 0, y: 0, force3D: true });
    if (wave) {
      tl.fromTo(
        wave,
        { height: flexHeight, force3D: true },
        { height: "0vh", duration: DURATION, ease, force3D: true },
      );
    }
    tl.to(el, { yPercent: 100, duration: DURATION, ease, force3D: true }, "<")
      .set(el, { yPercent: -100, y: 0 });

    return () => {
      clearRescueTimeout();
      tl.kill();
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (busy.current || event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.(
        INTERNAL_LINK,
      ) as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      // Normalizar rutas comparativas
      const cleanHref = href.split("?")[0].split("#")[0];
      const cleanPathname = pathname.split("?")[0].split("#")[0];
      if (cleanHref === cleanPathname) return;

      const el = panelRef.current;
      const wave = waveRef.current;
      if (!el) return;

      event.preventDefault();
      event.stopPropagation();

      busy.current = true;
      clearRescueTimeout();

      // Timeout de rescate de 1.5s por seguridad
      timeoutRef.current = setTimeout(() => {
        busy.current = false;
      }, 1500);

      gsap.killTweensOf(el);
      if (wave) gsap.killTweensOf(wave);

      const flexHeight = isDesktop() ? "20vh" : "7vh";
      const tl = gsap.timeline();
      tl.set(el, { yPercent: -100, y: 0, force3D: true });

      if (wave) {
        tl.fromTo(
          wave,
          { height: flexHeight, force3D: true },
          { height: "0vh", duration: DURATION, ease, force3D: true },
        );
      }
      tl.to(el, { yPercent: 0, duration: DURATION, ease, force3D: true }, "<")
        .add(() => {
          router.push(href);
        });
    };

    document.addEventListener("click", onClick, true);
    return () => {
      clearRescueTimeout();
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, router]);

  return (
    <>
      {children}
      <div className="page-transition" aria-hidden="true">
        <div
          ref={panelRef}
          className="page-transition__panel darkGradient flex flex-col justify-between"
        >
          <div className="page-transition__body darkGradient grow" />
          <div
            ref={waveRef}
            className="page-transition__wave rounded__div__up !relative z-50 darkGradient"
          >
            <div className="round__bg__up darkGradient" />
          </div>
        </div>
      </div>
    </>
  );
}