import React from "react";
import { Header } from "@/common/ui/parts/Header";
import { Bulge } from "@/common/ui/parts/Bulge";
import { WorkLandingWrapper } from "../parts/WorkLandingWrapper";

export function WorkLandingSection({}) {
  return (
    <section className="section section__3 third darkGradient overflow-hidden px-paddingX py-paddingY">
      <Bulge type="Light" />
      <Header color="Light"></Header>
      <WorkLandingWrapper />
    </section>
  );
}
