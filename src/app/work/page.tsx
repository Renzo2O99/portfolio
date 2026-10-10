"use client";

import { useState } from "react";
import "../work.css";
import "../header.css";
import { CustomCursor } from "@/common";
import { FullscreenMenu } from "../FullscreenMenu";
import { WorkSectionNav, WorkPageSection } from "@/modules/work";
import { WorkScrollProvider } from "@/shared";

const projectsData = [
  {
    title: (
      <>
        YieldStone <br /> Page
      </>
    ),
    description: "Webflow Site",
    link: "https://www.yieldstone.ai/",
    imageLink: "/img/projects/1.avif",
  },
  {
    title: (
      <>
        Simple Font <br /> Replacer
      </>
    ),
    description: "Figma Plugin",
    link: "https://www.figma.com/community/plugin/1380643582596908985/simple-font-replacer",
    imageLink: "/img/projects/2.avif",
  },
  {
    title: (
      <>
        Andy PFP <br /> Generator
      </>
    ),
    description: "Next.js Site",
    link: "https://generator.andytoken.com/",
    imageLink: "/img/projects/3.avif",
  },
  {
    title: (
      <>
        PonkeSol <br /> Page
      </>
    ),
    description: "Webflow Site",
    link: "https://ponkecoin-ninetyeight.webflow.io/",
    imageLink: "/img/projects/4.avif",
  },
  {
    title: (
      <>
        AmanFX <br /> Portfolio
      </>
    ),
    description: "Webflow Site",
    link: "https://amanfx.webflow.io/",
    imageLink: "/img/projects/5.avif",
  },
  {
    title: (
      <>
        Therapist <br /> Website
      </>
    ),
    description: "UI Design",
    link: "https://www.figma.com/proto/Tzz9bwrjHtSza87b1l3D0i/Inner-Strength-UI-Design?type=design&node-id=37-10&t=pq2KDLjYbMU4LFgA-1&scaling=min-zoom&page-id=0%3A1&mode=design",
    imageLink: "/img/projects/6.avif",
  },
];

export default function WorkPage() {
  const [active, setActive] = useState(0);

  return (
    <>
      <CustomCursor />
      <FullscreenMenu />
      <div className="background">
        PROJECTS
        <br />
        PROJECTS
      </div>
      <WorkScrollProvider onSectionChange={setActive} overlay={<WorkSectionNav total={projectsData.length} active={active} />}>
        <div id="work-sections">
          {projectsData.map((project, index) => (
            <WorkPageSection key={index} project={project} index={index} color={index % 2 !== 0 ? "Light" : "Dark"} />
          ))}
        </div>
      </WorkScrollProvider>
    </>
  );
}
