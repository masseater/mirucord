import type { ReactNode } from "react";

const TITLE = "mirucord";

const HomePage = (): ReactNode => (
  <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
  </main>
);

export { HomePage };
