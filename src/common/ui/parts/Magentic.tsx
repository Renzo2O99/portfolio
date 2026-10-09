import { gsap } from "gsap";
import Link from "next/link";
import { type AnchorHTMLAttributes, memo, type ReactNode, useEffect, useRef } from "react";

import { cn, isDesktop } from "@/shared";

type MagenticProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
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
};

const Magentic = ({ children, className, onMouseEnter, onMouseLeave, scrambleParams, hoverUnderline = false, strength = 60, ...rest }: MagenticProps) => {
  const magnet = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (magnet.current === null) {
      return;
    }

    const magnetButton = magnet.current;
    const shapka = magnetButton.querySelector(".shapka");

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

      gsap.to(magnetButton, {
        x: magneticWidth * (strength / 2),
        y: magneticHeight * (strength / 2),
        duration: 0.8,
        ease: "power3.out",
        overwrite: "auto",
      });

      if (shapka) {
        gsap.to(shapka, {
          x: magneticWidth * (strength / 4),
          y: magneticHeight * (strength / 4),
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
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
      gsap.killTweensOf(magnetButton);
      if (shapka) gsap.killTweensOf(shapka);
    };
  }, [strength]);

  function handleScramble(
    params: {
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
            scrambleText: params,
            duration: 0.8,
            ease: "power3.out",
          })
          .progress(0.04);
      }
    }
  }

  const isInternal = (rest.href ?? "").startsWith("/");

  const classes = cn(`flex justify-center *:pointer-events-none ${hoverUnderline ? " before:absolute before:bottom-0 before:h-0.5 before:w-0 before:origin-center before:bg-muted-foreground before:transition-all before:duration-300 hover:before:w-full " : " "}${className}`);

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
          if (Array.isArray(scrambleParams)) {
            scrambleParams.forEach((param, i) => {
              const el = scrambleEl[i];
              if (el instanceof HTMLElement) {
                handleScramble({ speed: 0.1, chars: "-x", ...param }, el);
              }
            });
          } else {
            const firstEl = scrambleEl[0];
            if (firstEl instanceof HTMLElement) {
              handleScramble({ speed: 0.1, chars: "-x", ...scrambleParams }, firstEl);
            }
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
