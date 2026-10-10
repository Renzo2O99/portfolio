import { RoundedSlideTransition, Header } from "@/common";
import { WorkTeaserContent } from "../parts/WorkTeaserContent";

export function WorkLandingSection() {
  return (
    <section className="section section__3 third darkGradient overflow-hidden px-paddingX pb-24 pt-paddingY md:pb-paddingY">
      <RoundedSlideTransition type="Light" />
      <Header color="Light" />
      <WorkTeaserContent />
    </section>
  );
}
