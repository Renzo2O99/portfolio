"use client";

import { createContext, useContext } from "react";

export const FullpageNavContext = createContext<{
  goTo: (index: number) => void;
  currentIndex: number;
  total: number;
} | null>(null);

export const useFullpageNav = () => useContext(FullpageNavContext);