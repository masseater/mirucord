import type { ReactNode } from "react";

const Figure = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-milk text-ink mt-1 max-w-3xl overflow-x-auto rounded-lg p-4 md:p-8">
    {children}
  </div>
);

export { Figure };
