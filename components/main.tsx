import { LandingNav } from "@/components/landingNav";
import { WorkSection } from "@/components/workSection/workSection";
import { HeroSection } from "@/components/heroSection/heroSection";
import { AboutSection } from "@/components/aboutSection/aboutSection";
import { ContactSection } from "@/components/contactSection/contactSection";

export function Main() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      {/* <WorkSection /> */}
      <ContactSection />
      <LandingNav />
    </>
  );
}
