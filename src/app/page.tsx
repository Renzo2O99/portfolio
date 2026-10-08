"use client";
import { Main } from "@/common/ui/parts/Main";
import { Cursor } from "@/common/ui/parts/Cursor";
import FullpageProvider from "@/shared/hooks/FullpageProvider";
import { HeaderNavigation } from "@/common/ui/parts/HeaderNavigation";

import "./index.css";

export default function HomePage({}) {
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
