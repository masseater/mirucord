import type { ReactNode } from "react";

const AI = "ＡＩ";
const REST = "が掘り起こす";

const HeroTitleFocus = (): ReactNode => (
  <span className="text-shu">
    <span className="text-upright">{AI}</span>
    {REST}
  </span>
);

export { HeroTitleFocus };
