import { LandingNav } from "@/common/ui/parts/LandingNav";
import { AboutSection } from "@/modules/about";
import { ContactSection } from "@/modules/contact";
import { HeroSection } from "@/modules/hero";

export function Main() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ContactSection />
      <LandingNav />
    </>
  );
}
