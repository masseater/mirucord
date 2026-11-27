import type { ReactNode } from "react";

export type Heading = Readonly<{ guide?: string; lead: string; tail?: string }>;

export const PostHeading = ({ heading }: Readonly<{ heading: Heading }>): ReactNode => (
  <>
    {typeof heading.guide === "string" && <p>{heading.guide}</p>}
    <h2 className="text-dc-bright font-maru my-1 text-2xl leading-snug font-black md:text-3xl">
      <span className="block">{heading.lead}</span>
      <span className="block">{heading.tail}</span>
    </h2>
  </>
);
