"use client";

// EXCEPTION: Módulo contact no requiere hooks/ ni store/ dedicados por alcance actual de la funcionalidad.
// PLAN: Implementar hooks de telemetría y store de estado si se añaden formularios multipaso.
// TIMELINE: Q4 2026

export { CONTACT_TEXTS } from "./lib/contact-texts.constants";
export { type ContactFormValues, contactFormSchema, type TFormSchema } from "./models/contact.schema";
export { BgImage } from "./ui/parts/BgImage";
export { BgImagesContainer } from "./ui/parts/BgImagesContainer";
export { ErrorBoundary } from "./ui/parts/ErrorBoundary";
export { Footer } from "./ui/parts/Footer";
export { FooterGroup } from "./ui/parts/FooterGroup";
export { ContactSection } from "./ui/sections/ContactSection";
