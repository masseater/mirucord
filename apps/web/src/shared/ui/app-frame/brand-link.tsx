import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { SERVICE_NAME } from "#/shared/config";

const BRAND = SERVICE_NAME;

const BrandLink = (): ReactNode => (
  <a
    href="/"
    className="text-dc-bright font-maru flex items-center gap-2 text-xl font-black no-underline"
  >
    <Mascot className="size-8" />
    {BRAND}
  </a>
);

export { BrandLink };
