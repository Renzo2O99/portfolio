"use client";

// EXCEPTION: Módulo contact no requiere hooks/ ni store/ dedicados por alcance actual de la funcionalidad.
// PLAN: Implementar hooks de telemetría y store de estado si se añaden formularios multipaso.
// TIMELINE: Q4 2026

export { CONTACT_TEXTS } from "./lib/contact-texts.constants";
export { type ContactFormValues, contactFormSchema } from "./models/contact.schema";
export { BackgroundImage } from "./ui/parts/BackgroundImage";
export { BackgroundImages } from "./ui/parts/BackgroundImages";
export { ErrorBoundary } from "./ui/parts/ErrorBoundary";
export { Footer } from "./ui/parts/Footer";
export { FooterGroup } from "./ui/parts/FooterGroup";
export { ContactSection } from "./ui/sections/ContactSection";
