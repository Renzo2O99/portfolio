import Image from "next/image";
import type { ProjectCardProps } from "../../models/about.types";

function ProjectCard({ imgSrc }: ProjectCardProps) {
  return (
    <article className="relative aspect-video overflow-hidden rounded-3xl px-16 py-[1.5em] md:rounded-none md:p-[0.2em]">
      <div className="relative z-10 h-full w-full">
        <Image src={imgSrc} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </div>
      <div className="mask absolute left-0 top-0 -z-10 h-full w-full bg-colorSecondaryLight opacity-80" />
    </article>
  );
}

export { ProjectCard };
