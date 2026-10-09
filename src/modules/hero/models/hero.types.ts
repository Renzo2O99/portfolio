import type { RefObject } from "react";
import type { BufferGeometry } from "three";

export type Object3DProps = {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
};

export type GLTFNodeWithGeometry = {
  geometry?: BufferGeometry;
};

export type ImageSequenceProps = {
  sectionRef: RefObject<HTMLElement | null>;
};
