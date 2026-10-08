import React from "react";
import { Header } from "@/common/ui/parts/Header";
import { Bulge } from "@/common/ui/parts/Bulge";
import { AboutWrapper } from "../parts/AboutWrapper";

export function AboutSection({}) {
  return (
    <section className="section section__2 second lightGradient items-center justify-center  px-paddingX pb-10 pt-paddingY text-colorDark">
      <Bulge type="Dark" />
      <Header color="Dark"></Header>
      <AboutWrapper />
    </section>
  );
}
