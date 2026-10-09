import { Bulge, Header } from "@/common";
import { WorkLandingWrapper } from "../parts/WorkLandingWrapper";

export function WorkLandingSection() {
  return (
    <section className="section section__3 third darkGradient overflow-hidden px-paddingX pb-24 pt-paddingY md:pb-paddingY">
      <Bulge type="Light" />
      <Header color="Light" />
      <WorkLandingWrapper />
    </section>
  );
}
