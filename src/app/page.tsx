"use client";
import { Cursor, HeaderNavigation, Main } from "@/common";
import { FullpageProvider } from "@/shared";

import "./index.css";

export default function HomePage() {
  return (
    <>
      <Cursor />
      {/* <Intro /> */}
      <HeaderNavigation />
      <FullpageProvider>
        <Main />
      </FullpageProvider>
    </>
  );
}
