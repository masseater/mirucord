import type { ReactNode } from "react";

const MemberGroup = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): ReactNode => (
  <>
    <p className="text-dc-muted px-2 pt-4 pb-1 text-xs font-bold">{label}</p>
    <ul>{children}</ul>
  </>
);

export { MemberGroup };
