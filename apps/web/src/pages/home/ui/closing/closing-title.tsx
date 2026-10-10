import type { ReactNode } from "react";

const LEAD = "さっそく";
const TAIL = "思い出を掘り起こそう";

const ClosingTitle = (): ReactNode => (
  <h2 className="text-4xl leading-snug font-black md:text-6xl">
    <span className="block">{LEAD}</span>
    <span className="marker-butter">{TAIL}</span>
  </h2>
);

export { ClosingTitle };
