import React, { memo, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";

import { cn, isDesktop } from "@/shared/lib/utils";

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

const Magentic = ({
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  scrambleParams,
  hoverUnderline = false,
  strength = 60,
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
      duration: 0.8,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(magnetButton, "y", {
      duration: 0.8,
      ease: "power3.out",
    });
    const shapkaXTo = shapka
      ? gsap.quickTo(shapka, "x", { duration: 0.8, ease: "power3.out" })
      : null;
    const shapkaYTo = shapka
      ? gsap.quickTo(shapka, "y", { duration: 0.8, ease: "power3.out" })
      : null;

    function handleMagnetMove(event: MouseEvent) {
      const currentX = Number(gsap.getProperty(magnetButton, "x")) || 0;
      const currentY = Number(gsap.getProperty(magnetButton, "y")) || 0;
      const bounding = magnetButton.getBoundingClientRect();

      const centerX = bounding.left + bounding.width / 2 - currentX;
      const centerY = bounding.top + bounding.height / 2 - currentY;

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;

      const magneticWidth = deltaX / (bounding.width / 2);
      const magneticHeight = deltaY / (bounding.height / 2);

      xTo(magneticWidth * (strength / 2));
      yTo(magneticHeight * (strength / 2));
      shapkaXTo?.(magneticWidth * (strength / 4));
      shapkaYTo?.(magneticHeight * (strength / 4));
    }

    function handleMagnetLeave() {
      gsap.to(magnetButton, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "elastic.out(1.2, 0.4)",
        overwrite: "auto",
      });
      if (shapka) {
        gsap.to(shapka, {
          x: 0,
          y: 0,
          duration: 1.2,
          ease: "elastic.out(1.2, 0.4)",
          overwrite: "auto",
        });
      }
    }

    if (isDesktop()) {
      magnetButton.addEventListener("mousemove", handleMagnetMove);
      magnetButton.addEventListener("mouseleave", handleMagnetLeave);
    }

    return () => {
      magnetButton.removeEventListener("mousemove", handleMagnetMove);
      magnetButton.removeEventListener("mouseleave", handleMagnetLeave);
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
    if (typeof window !== "undefined") {
      const globalPlugin = (window as unknown as { ScrambleTextPlugin?: object }).ScrambleTextPlugin;
      if (globalPlugin) {
        gsap.registerPlugin(globalPlugin);
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
        if (scrambleParams && magnet.current) {
          const magnetButton = magnet.current;
          const scrambleEl = magnetButton.querySelectorAll(".scrambleText");
          if (scrambleParams instanceof Array) {
            scrambleParams.forEach((param, i) => {
              if (scrambleEl[i]) {
                handleScramble(
                  { speed: 0.1, chars: "-x", ...param },
                  scrambleEl[i] as HTMLElement,
                );
              }
            });
          } else if (scrambleEl[0]) {
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
