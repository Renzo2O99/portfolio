export function HeroMarquee() {
  return (
    <div className="wrapperRollingText anime pointer-events-none z-20 select-none rounded-3xl tracking-[-0.1em] overflow-hidden">
      <div className="rollingText md:!text-[200px] marquee-track">
        <span className="marquee-content">- Vipul - Kumar - Vipul - Kumar&nbsp;</span>
        <span className="marquee-content" aria-hidden="true">
          - Vipul - Kumar - Vipul - Kumar&nbsp;
        </span>
      </div>
    </div>
  );
}
