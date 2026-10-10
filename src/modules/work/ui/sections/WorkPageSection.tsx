"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { RoundedSlideTransition, Header, MagneticLink } from "@/common";
import { cn } from "cn";
import { WORK_TEXTS } from "../../lib/work-texts.constants";
import type { WorkProject } from "../../models/work.types";

type WorkPageSectionProps = {
  index: number;
  project: WorkProject;
  color: "Dark" | "Light";
};

export function WorkPageSection({ index, project, color }: WorkPageSectionProps) {
  return (
    <div className={cn(WORK_TEXTS.CLASS_SECTION, `s${index}`, color === "Dark" ? "lightGradient text-colorDark" : "darkGradient text-colorLight")} key={project.link}>
      <Header color={color} />
      <RoundedSlideTransition type={color} />

      <div className="flex h-[100dvh] w-full items-center px-paddingX pb-24 md:pb-0">
        <div className="work__slide mx-auto max-w-maxWidth">
          <a className={cn("image image--works", `image--works${index + 1}`, "anime relative block rounded-3xl")} target="_blank" rel="noreferrer" href={project.link}>
            <Image src={project.imageLink} alt="" fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 70vw, 800px" loading={index === 0 ? "eager" : "lazy"} priority={index === 0} className="object-contain" />
            <div className="image__over">
              <div className="image__cover">1</div>
              <div className="image__cover">2</div>
            </div>
            <div className="page-num absolute anime">
              <div className="mask absolute left-0 top-0 -z-10 h-full w-full rounded-2xl bg-colorSecondaryDark" />
              <p className="p-8 text-colorLight">0{index + 1}</p>
            </div>
          </a>
          <div className="title">
            <h2 className="title__text js-letter anime mask font-bold tracking-tight">
              {project.title}
              <br />
            </h2>
            <div className="js-letter anime borderv">
              <span className={color === "Dark" ? "bg-colorSecondaryDark" : "bg-colorSecondaryLight"} />
              <span className={color === "Dark" ? "bg-colorSecondaryDark" : "bg-colorSecondaryLight"} />
            </div>
            <p className="title__lead js-letter anime">{project.description}</p>
            <div className="btn-wrap js-letter anime">
              <MagneticLink strength={35} className={cn("btn rounded-full", color === "Dark" ? "bg-colorDark text-colorLight" : "bg-colorLight text-colorDark")} href={project.link} target="_blank" scrambleParams={{ text: WORK_TEXTS.BUTTON_SHOW_ME, chars: "-x" }}>
                <p className="shapka">
                  <span className="scrambleText">{WORK_TEXTS.BUTTON_SHOW_ME}</span>
                  <ArrowUpRight className="ml-2 inline h-[1.1em] w-[1.1em] text-inherit" aria-hidden="true" />
                </p>
              </MagneticLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
