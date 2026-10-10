"use client";

// EXCEPTION: Módulo hero no requiere hooks/ ni store/ dedicados por alcance actual de la animación.
// PLAN: Implementar hook use-hero-sequence si se desacopla la lógica del canvas.
// TIMELINE: Q4 2026

export { HERO_TEXTS } from "./lib/hero-texts.constants";
export type { HeroFrameScrubberProps } from "./models/hero.types";
export { HeroCanvas } from "./ui/modals/HeroCanvas";
export { ErrorBoundary } from "./ui/parts/ErrorBoundary";
export { LatestWorkCta } from "./ui/parts/LatestWorkCta";
export { HeroMarquee } from "./ui/parts/HeroMarquee";
export { HeroContent } from "./ui/parts/HeroContent";
export { HeroFrameScrubber } from "./ui/parts/HeroFrameScrubber";
export { HeroSection } from "./ui/sections/HeroSection";
