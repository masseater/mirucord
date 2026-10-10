import type { ReactNode } from "react";

import mascotSrc from "./mascot.webp";

const Mascot = ({ className }: Readonly<{ className: string }>): ReactNode => (
  <img src={mascotSrc} alt="" width="384" height="384" decoding="async" className={className} />
);

export { Mascot };
