type RoundedSlideTransitionProps = {
  type: "Dark" | "Light";
};

// NOTE: RoundedSlideTransition renders the rounded slide-transition divs (parallax effect on slide change).

export function RoundedSlideTransition({ type }: RoundedSlideTransitionProps) {
  return (
    <>
      {type === "Dark" ? (
        <>
          <div className="rounded__div__down darkGradient">
            <div className="round__bg__down lightGradient"></div>
          </div>
          <div className="rounded__div__up darkGradient">
            <div className="round__bg__up lightGradient"></div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded__div__down lightGradient">
            <div className="round__bg__down darkGradient"></div>
          </div>
          <div className="rounded__div__up lightGradient">
            <div className="round__bg__up darkGradient"></div>
          </div>
        </>
      )}
    </>
  );
}
