import React, { memo, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";

import { cn, isDesktop } from "@/lib/utils";

interface MagenticProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href?: string;
  className?: string;
  strength?: number;
  hoverUnderline?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  scrambleParams?:
    | {
        text: string;
        chars?: string;
        speed?: number;
      }
    | {
        text: string;
        chars?: string;
        speed?: number;
      }[];
}

let globalMagneticHandler: ((e: MouseEvent) => void) | null = null;
let magneticElements: Set<HTMLElement> = new Set();

function handleGlobalMouseMove(e: MouseEvent) {
  magneticElements.forEach((magnetButton) => {
    if (!magnetButton.isConnected) {
      magneticElements.delete(magnetButton);
      return;
    }

    const shapka = magnetButton.querySelector(".shapka");
    const strength = parseFloat(magnetButton.dataset.strength || "100");
    const bounding = magnetButton.getBoundingClientRect();
    const magneticWidth =
      (e.clientX - bounding.left) / magnetButton.offsetWidth - 0.5;
    const magneticHeight =
      (e.clientY - bounding.top) / magnetButton.offsetHeight - 0.5;

    gsap.to(magnetButton, {
      x: magneticWidth * strength,
      y: magneticHeight * strength,
      ease: "power2.out",
      duration: 1,
    });

    if (shapka) {
      gsap.to(shapka, {
        x: magneticWidth * (strength / 2),
        y: magneticHeight * (strength / 2),
        ease: "power2.out",
        duration: 1,
      });
    }
  });
}

function handleGlobalMouseOut(e: MouseEvent) {
  const target = e.relatedTarget as HTMLElement;
  magneticElements.forEach((magnetButton) => {
    if (!magnetButton.contains(target)) {
      const shapka = magnetButton.querySelector(".shapka");
      gsap.to([magnetButton, shapka], {
        x: 0,
        y: 0,
        ease: "elastic.out(1,0.4)",
        duration: 1.5,
      });
    }
  });
}

const Magentic = ({
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  scrambleParams,
  hoverUnderline = false,
  strength = 100,
  ...rest
}: MagenticProps) => {
  const magnet = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (magnet.current === null) {
      return;
    }

    const magnetButton = magnet.current as HTMLAnchorElement;
    const shapka = magnetButton.querySelector(".shapka");

    const xTo = gsap.quickTo(magnetButton, "x", {
      duration: 1,
      ease: "power2.out",
    });
    const yTo = gsap.quickTo(magnetButton, "y", {
      duration: 1,
      ease: "power2.out",
    });
    const shapkaXTo = shapka
      ? gsap.quickTo(shapka, "x", { duration: 1, ease: "power2.out" })
      : null;
    const shapkaYTo = shapka
      ? gsap.quickTo(shapka, "y", { duration: 1, ease: "power2.out" })
      : null;

    if (isDesktop()) {
      magnetButton.addEventListener("mousemove", handleMagnetMove);
      magnetButton.addEventListener("mouseout", handleMagnetOut);
    }

    function handleMagnetOut() {
      xTo(0);
      yTo(0);
      shapkaXTo?.(0);
      shapkaYTo?.(0);
    }

    function handleMagnetMove(event: MouseEvent) {
      const bounding = magnetButton.getBoundingClientRect();
      const magneticWidth =
        (event.clientX - bounding.left) / magnetButton.offsetWidth - 0.5;
      const magneticHeight =
        (event.clientY - bounding.top) / magnetButton.offsetHeight - 0.5;

      xTo(magneticWidth * strength);
      yTo(magneticHeight * strength);
      shapkaXTo?.(magneticWidth * (strength / 2));
      shapkaYTo?.(magneticHeight * (strength / 2));
    }

    return () => {
      magnet.current?.removeEventListener("mousemove", handleMagnetMove);
      magnet.current?.removeEventListener("mouseout", handleMagnetOut);
    };
  }, [strength]);

  function handleScramble(
    scrambleParams: {
      text: string;
      chars?: string;
      speed?: number;
    },
    scrambleEl: HTMLElement,
  ) {
    if (typeof ScrambleTextPlugin !== "undefined") {
      gsap.set(scrambleEl, {
        width: scrambleEl?.clientWidth,
      });
      gsap
        .to(scrambleEl, {
          scrambleText: scrambleParams,
          duration: 0.8,
          ease: "power3.out",
        })
        .progress(0.04);
    }
  }
  const isInternal = (rest.href ?? "").startsWith("/");

  const classes = cn(
    "flex justify-center *:pointer-events-none  " +
      (hoverUnderline
        ? " before:absolute before:bottom-0 before:h-0.5 before:w-0 before:origin-center before:bg-[#a3a3a3] before:transition-all before:duration-300 hover:before:w-full "
        : " ") +
      className,
  );

  return (
    <Link
      ref={magnet}
      href={(rest.href as string) ?? "#"}
      target={isInternal ? undefined : rest.target}
      className={classes}
      onMouseEnter={() => {
        if (scrambleParams) {
          if (magnet.current === null) {
            return;
          }
          const magnetButton = magnet.current as HTMLAnchorElement;
          gsap.registerPlugin(ScrambleTextPlugin);

          const scrambleEl = magnetButton.querySelectorAll(".scrambleText");
          if (scrambleParams instanceof Array) {
            scrambleParams.forEach((param, i) => {
              handleScramble(
                { speed: 0.1, chars: "-x", ...param },
                scrambleEl[i] as HTMLElement,
              );
            });
          } else {
            handleScramble(
              { speed: 0.1, chars: "-x", ...scrambleParams },
              scrambleEl[0] as HTMLElement,
            );
          }
        }
        onMouseEnter?.();
      }}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      {children}
    </Link>
  );
};

export default memo(Magentic);
