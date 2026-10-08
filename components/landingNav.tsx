"use client";

import { cn } from "@/lib/utils";
import { useFullpageNav } from "@/components/fullpageNavContext";

export function LandingNav() {
  const nav = useFullpageNav();
  const goTo = nav?.goTo ?? (() => {});
  const current = nav?.currentIndex ?? 0;
  const total = nav?.total ?? 3;

  if (!goTo || total <= 1) return null;

  const goPrev = () => goTo(current - 1);
  const goNext = () => goTo(current + 1);
  const atStart = current <= 0;
  const atEnd = current >= total - 1;

  return (
    <nav
      aria-label="Section navigation"
      className="pointer-events-none absolute inset-x-0 bottom-6 z-[500] flex items-end justify-center gap-1 sm:gap-2"
    >
      <button
        type="button"
        aria-label="Previous section"
        disabled={atStart}
        onClick={goPrev}
        className={cn(
          "group pointer-events-auto h-12 w-8 cursor-pointer sm:h-14 sm:w-12 lg:w-16",
          "rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark",
          atStart && "opacity-30 pointer-events-none"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mx-auto block rounded-full transition-[height,opacity] duration-300",
            "bg-colorSecondaryDark group-hover:bg-colorDark",
            "h-5 w-1 opacity-50 group-hover:opacity-100 sm:h-6 sm:w-1.5"
          )}
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 mx-auto my-1 text-current"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        aria-label="Next section"
        disabled={atEnd}
        onClick={() => nav?.goTo((nav.currentIndex ?? 0) + 1)}
        className={cn(
          "group pointer-events-auto h-12 w-8 cursor-pointer sm:h-14 sm:w-12 lg:w-16",
          "rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-colorDark",
          atEnd && "opacity-30 pointer-events-none"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mx-auto block rounded-full transition-[height,opacity] duration-300",
            "bg-colorSecondaryDark group-hover:bg-colorDark",
            "h-5 w-1 opacity-50 group-hover:opacity-100 sm:h-6 sm:w-1.5"
          )}
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 mx-auto my-1 text-current"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>
    </nav>
  );
}