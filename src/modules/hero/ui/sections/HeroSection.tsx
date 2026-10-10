import { RoundedSlideTransition, Header } from "@/common";
import { HeroContent } from "../parts/HeroContent";
import { HeroCanvas } from "../modals/HeroCanvas";

export function HeroSection() {
  return (
    <section className="section section__1 darkGradient first relative z-0 px-paddingX text-colorLight">
      <RoundedSlideTransition type="Light" />
      <Header color="Light" />
      <HeroContent />
      <div className="absolute left-0 top-0 z-10 flex h-full w-full items-center justify-center">
        <HeroCanvas />
      </div>
    </section>
  );
}
