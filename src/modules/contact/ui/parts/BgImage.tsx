import { getRandRgb } from "@/shared/lib/utils";
import Image from "next/image";
import React from "react";

type BgImageProps = {
  total: number;
  item: {
    id: number;
    imgLink: string;
    title: string;
    subtitle: string;
  };
  i: number;
};

export function BgImage({ total, item, i }: BgImageProps) {
  const zIndex = Math.floor(total / 2) == i ? 520 : i % 10;

  return (
    <div
      style={{
        filter: `brightness(85%)`,
        zIndex: `${zIndex}`,
      }}
      className="bgImages drop-shadow-smd absolute h-[95px] w-[95px] xs:h-[110px] xs:w-[110px] sm:h-[130px] sm:w-[130px] origin-[center_center] translate-x-[-50%] translate-y-[0%] overflow-hidden rounded-2xl md:h-[250px] md:w-[250px] md:rounded-3xl"
    >
      <Image
        src={item.imgLink}
        fill={true}
        alt=""
        className="h-full !w-auto min-w-full max-w-none object-cover"
      />
    </div>
  );
}
