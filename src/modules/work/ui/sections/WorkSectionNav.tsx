"use client";

import { Button } from "@/common";
import { useSectionScroll } from "@/shared";
import { cn } from "cn";
import { WORK_TEXTS } from "../../lib/work-texts.constants";

type WorkSectionNavProps = {
  total: number;
  active: number;
};

export function WorkSectionNav({ total, active }: WorkSectionNavProps) {
  const nav = useSectionScroll();
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

  const baseBtn = "pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full p-0 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark";

  return (
    <nav aria-label={WORK_TEXTS.NAV_MAIN_LABEL} className="pointer-events-none absolute inset-x-0 bottom-6 z-[500] flex items-end justify-center gap-1 sm:gap-2">
      <Button type="button" variant="ghost" size="icon" aria-label={WORK_TEXTS.NAV_PREV_LABEL} onClick={handlePrev} disabled={isFirst} className={cn(baseBtn, isFirst ? "pointer-events-none cursor-not-allowed bg-colorSecondaryDark/40 opacity-40" : "pointer-events-auto bg-colorSecondaryDark hover:bg-colorDark")}>
        <svg aria-hidden="true" className="h-4 w-4 text-colorDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Button>

      {Array.from({ length: total }, (_, index) => {
        const isActive = index === active;

        return (
          <Button
            key={index}
            type="button"
            variant="ghost"
            aria-label={`${WORK_TEXTS.NAV_PROJECT_GOTO_PREFIX} ${index + 1}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => goTo(index)}
            className={cn("group pointer-events-auto h-12 w-8 cursor-pointer p-0 sm:h-14 sm:w-12 lg:w-16", "rounded-(--radius) hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark")}
          >
            <span aria-hidden="true" className={cn("mx-auto block rounded-(--radius) transition-[height,opacity] duration-300", "bg-colorSecondaryDark group-hover:bg-colorDark", isActive ? "h-12 w-1 opacity-100 sm:h-14 sm:w-1.5" : "h-5 w-1 opacity-50 group-hover:opacity-100 sm:h-6 sm:w-1.5")} />
          </Button>
        );
      })}

      <Button type="button" variant="ghost" size="icon" aria-label={WORK_TEXTS.NAV_NEXT_LABEL} onClick={handleNext} disabled={isLast} className={cn(baseBtn, isLast ? "pointer-events-none cursor-not-allowed bg-colorSecondaryDark/40 opacity-40" : "pointer-events-auto bg-colorSecondaryDark hover:bg-colorDark")}>
        <svg aria-hidden="true" className="h-4 w-4 text-colorDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Button>
    </nav>
  );
}
