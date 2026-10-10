import { HomeSectionNav } from "@/common";
import { AboutSection } from "@/modules/about";
import { ContactSection } from "@/modules/contact";
import { HeroSection } from "@/modules/hero";

export function LandingSections() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ContactSection />
      <HomeSectionNav />
    </>
  );
}
