import type { ReactNode } from "react";

const LAYOUT = {
  page: {
    frame: "bg-dc-rail",
    bar: "mx-auto h-14 w-full max-w-3xl px-5",
  },
  chat: {
    frame: "title-bar bg-dc-rail sticky top-0",
    bar: "h-10 px-3",
  },
} as const;

export type HeaderProps = Readonly<{
  layout: keyof typeof LAYOUT;
  children: ReactNode;
}>;

export const Header = ({ layout, children }: HeaderProps): ReactNode => (
  <header className={LAYOUT[layout].frame}>
    <div className={`flex items-center justify-between ${LAYOUT[layout].bar}`}>{children}</div>
  </header>
);
