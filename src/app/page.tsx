"use client";
import { CustomCursor } from "@/common";
import { FullscreenMenu } from "./FullscreenMenu";
import { LandingSections } from "./LandingSections";
import { LandingScrollProvider } from "@/shared";

import "./index.css";

export default function HomePage() {
  return (
    <>
      <CustomCursor />
      {/* <SplashIntro /> */}
      <FullscreenMenu />
      <LandingScrollProvider>
        <LandingSections />
      </LandingScrollProvider>
    </>
  );
}
