"use client";

import { createContext, useContext } from "react";

export const SectionScrollContext = createContext<{
  goTo: (index: number) => void;
  currentIndex: number;
  total: number;
} | null>(null);

export const useSectionScroll = () => useContext(SectionScrollContext);
