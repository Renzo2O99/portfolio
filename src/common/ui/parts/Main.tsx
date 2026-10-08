import { LandingNav } from "@/common/ui/parts/LandingNav";
import { HeroSection } from "@/modules/hero";
import { AboutSection } from "@/modules/about";
import { ContactSection } from "@/modules/contact";

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
