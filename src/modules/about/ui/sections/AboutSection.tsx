import { Bulge, Header } from "@/common";
import { AboutWrapper } from "../parts/AboutWrapper";

export function AboutSection() {
  return (
    <section className="section section__2 second lightGradient items-center justify-center px-paddingX pb-24 pt-paddingY text-colorDark md:pb-16">
      <Bulge type="Dark" />
      <Header color="Dark" />
      <AboutWrapper />
    </section>
  );
}
