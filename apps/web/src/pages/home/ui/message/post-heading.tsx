import type { ReactNode } from "react";

export const PostHeading = ({
  guide,
  lead,
  tail,
}: Readonly<{ guide?: string; lead: string; tail?: string }>): ReactNode => (
  <>
    {typeof guide === "string" && <p>{guide}</p>}
    <h2 className="text-dc-bright font-maru my-1 text-2xl leading-snug font-black md:text-3xl">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h2>
  </>
);
