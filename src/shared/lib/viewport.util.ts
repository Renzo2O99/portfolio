export const isDesktop = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth > 540;
};
