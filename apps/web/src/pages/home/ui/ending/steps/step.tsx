import type { ReactNode } from "react";

const Step = ({
  number,
  title,
  children,
}: Readonly<{ number: string; title: string; children: ReactNode }>): ReactNode => (
  <li className="border-kinu flex flex-col gap-5 border-b py-8 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0">
    <span className="font-mincho text-outline-sumi text-8xl leading-none font-black">{number}</span>
    <h3 className="text-xl font-bold">{title}</h3>
    {children}
  </li>
);

export { Step };
