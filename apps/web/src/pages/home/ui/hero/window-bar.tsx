import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

import { BrandMark } from "#/pages/home/ui/common/brand-mark";
import { SERVICE_NAME } from "#/shared/config";

const APP = "Claude";
const TOOL = SERVICE_NAME;

export const WindowBar = (): ReactNode => (
  <p className="bg-cream border-line flex items-center gap-2 border-b px-4 py-2 text-sm font-bold">
    <BrandMark path={siClaude.path} size="16" className="fill-claude" />
    {APP}
    <span className="bg-lavender ml-auto rounded-full px-2 py-0.5 font-mono text-xs">{TOOL}</span>
  </p>
);
