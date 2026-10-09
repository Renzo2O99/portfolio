"use client";

// EXCEPTION: Módulo about no requiere hooks/ ni store/ dedicados por alcance actual de la funcionalidad.
// PLAN: Implementar hooks de telemetría y store de estado si se añaden formularios multipaso.
// TIMELINE: Q4 2026

export { ABOUT_TEXTS } from "./lib/about-texts.constants";
export type { ProjectCardProps, TestimonialCardProps } from "./models/about.types";
export { ProjectCard } from "./ui/cards/ProjectCard";
export { TestimonialCard } from "./ui/cards/TestimonialCard";
export { AboutMarquee } from "./ui/parts/AboutMarquee";
export { AboutWrapper } from "./ui/parts/AboutWrapper";
export { ErrorBoundary } from "./ui/parts/ErrorBoundary";
export { AboutSection } from "./ui/sections/AboutSection";
