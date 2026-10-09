import type { JSX } from "react";

export type WorkProject = {
  title: JSX.Element;
  description: string | JSX.Element;
  link: string;
  imageLink: string;
};
