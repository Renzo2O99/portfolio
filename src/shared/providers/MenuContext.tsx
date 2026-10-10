"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type MenuState = {
  isMenuOpen: boolean;
  color: "Light" | "Dark";
};

type MenuContextValue = MenuState & {
  toggleMenu: (next: Partial<MenuState>) => void;
};

const MenuContext = createContext<MenuContextValue>({
  isMenuOpen: false,
  color: "Light",
  toggleMenu: () => {},
});

export function MenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MenuState>({
    isMenuOpen: false,
    color: "Light",
  });

  const toggleMenu = (next: Partial<MenuState>) => {
    setState((prev) => ({ ...prev, ...next }));
  };

  return <MenuContext.Provider value={{ ...state, toggleMenu }}>{children}</MenuContext.Provider>;
}

export const useMenu = () => useContext(MenuContext);
