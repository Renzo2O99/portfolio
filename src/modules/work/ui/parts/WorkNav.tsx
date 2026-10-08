"use client";

import { cn } from "@/shared/lib/utils";
import { useFullpageNav } from "@/shared/hooks/fullpageNavContext";

export function WorkNav({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  const nav = useFullpageNav();
  const goTo = nav?.goTo ?? (() => {});

  const isFirst = active === 0;
  const isLast = active === total - 1;

  const handlePrev = () => {
    if (isFirst) return;
    goTo(active - 1);
  };

  const handleNext = () => {
    if (isLast) return;
    goTo(active + 1);
  };

  const baseBtn =
    "pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark";

  return (
    <nav
      aria-label="Navegación de proyectos"
      className="pointer-events-none absolute inset-x-0 bottom-6 z-[500] flex items-end justify-center gap-1 sm:gap-2"
    >
      <button
        type="button"
        aria-label="Proyecto anterior"
        onClick={handlePrev}
        disabled={isFirst}
        className={cn(
          baseBtn,
          isFirst
            ? "pointer-events-none cursor-not-allowed bg-colorSecondaryDark/40 opacity-40"
            : "pointer-events-auto bg-colorSecondaryDark hover:bg-colorDark",
        )}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-colorDark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {Array.from({ length: total }, (_, i) => {
        const isActive = i === active;

        return (
          <button
            key={i}
            type="button"
            aria-label={`Ir al proyecto ${i + 1}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => goTo(i)}
            className={cn(
              "group pointer-events-auto h-12 w-8 cursor-pointer sm:h-14 sm:w-12 lg:w-16",
              "rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mx-auto block rounded-full transition-[height,opacity] duration-300",
                "bg-colorSecondaryDark group-hover:bg-colorDark",
                isActive
                  ? "h-12 w-1 opacity-100 sm:h-14 sm:w-1.5"
                  : "h-5 w-1 opacity-50 group-hover:opacity-100 sm:h-6 sm:w-1.5",
              )}
            />
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Siguiente proyecto"
        onClick={handleNext}
        disabled={isLast}
        className={cn(
          baseBtn,
          isLast
            ? "pointer-events-none cursor-not-allowed bg-colorSecondaryDark/40 opacity-40"
            : "pointer-events-auto bg-colorSecondaryDark hover:bg-colorDark",
        )}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-colorDark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
