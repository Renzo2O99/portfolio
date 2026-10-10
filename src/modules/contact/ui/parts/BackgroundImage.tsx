import Image from "next/image";
import { CONTACT_TEXTS } from "../../lib/contact-texts.constants";

type BackgroundImageProps = {
  total: number;
  imageItem: {
    id: number;
    imgLink: string;
    title: string;
    subtitle: string;
  };
  index: number;
};

export function BackgroundImage({ total, imageItem, index }: BackgroundImageProps) {
  const zIndex = Math.floor(total / 2) === index ? 520 : index % 10;

  return (
    <div
      style={{
        filter: CONTACT_TEXTS.FILTER_BRIGHTNESS_85,
        zIndex: `${zIndex}`,
      }}
      className="backgroundImages drop-shadow-smd absolute h-[95px] w-[95px] xs:h-[110px] xs:w-[110px] sm:h-[130px] sm:w-[130px] origin-[center_center] translate-x-[-50%] translate-y-[0%] overflow-hidden rounded-2xl md:h-[250px] md:w-[250px] md:rounded-3xl"
    >
      <Image src={imageItem.imgLink} fill alt="" className="h-full !w-auto min-w-full max-w-none object-cover" />
    </div>
  );
}
