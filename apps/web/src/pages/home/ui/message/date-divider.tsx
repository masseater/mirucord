import type { ReactNode } from "react";

const DateDivider = ({ date }: Readonly<{ date: string }>): ReactNode => (
  <div className="text-dc-muted mx-4 mt-6 mb-2 flex items-center gap-2 text-xs font-bold">
    <hr className="border-dc-line grow" />
    {date}
    <hr className="border-dc-line grow" />
  </div>
);

export { DateDivider };
