import Lottie from "lottie-react";
import animationData from "@/shared/data/data.json";

export function SplashIntro() {
  return (
    <div id="intro" className="home__starteranimation">
      <div className="background__color"></div>
      <Lottie className="animation__container" animationData={animationData} loop={true} autoplay={true} />
    </div>
  );
}
