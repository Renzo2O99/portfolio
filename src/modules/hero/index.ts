"use client";

// EXCEPTION: Módulo hero no requiere hooks/ ni store/ dedicados por alcance actual de la animación.
// PLAN: Implementar hook use-hero-sequence si se desacopla la lógica del canvas.
// TIMELINE: Q4 2026

export { HERO_TEXTS } from "./lib/hero-texts.constants";
export type { GLTFNodeWithGeometry, ImageSequenceProps, Object3DProps } from "./models/hero.types";
export { HeroModal } from "./ui/modals/HeroModal";
export { ErrorBoundary } from "./ui/parts/ErrorBoundary";
export { HeroButton } from "./ui/parts/HeroButton";
export { HeroMarquee } from "./ui/parts/HeroMarquee";
export { HeroWrapper } from "./ui/parts/HeroWrapper";
export { ImageSequence } from "./ui/parts/ImageSequence";
export { HeroSection } from "./ui/sections/HeroSection";
