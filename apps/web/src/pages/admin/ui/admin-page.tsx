import type { ReactNode } from "react";

import { AdminBody } from "./admin-body";

const TITLE = "mirucord admin";

const AdminPage = (): ReactNode => (
  <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
    <AdminBody />
  </main>
);

export { AdminPage };
