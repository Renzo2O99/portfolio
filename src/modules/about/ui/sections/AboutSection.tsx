import { RoundedSlideTransition, Header } from "@/common";
import { AboutContent } from "../parts/AboutContent";

export function AboutSection() {
  return (
    <section className="section section__2 second lightGradient items-center justify-center px-paddingX pb-24 pt-paddingY text-colorDark md:pb-16">
      <RoundedSlideTransition type="Dark" />
      <Header color="Dark" />
      <AboutContent />
    </section>
  );
}
