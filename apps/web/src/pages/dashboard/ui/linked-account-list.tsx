import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { PublicConnection } from "#/shared/discord/index.server";

import { LinkedAccountLine } from "./linked-account-line";

const LinkedAccountList = ({
  connections,
}: Readonly<{ connections: readonly PublicConnection[] }>): ReactNode => (
  <ul className="flex flex-col gap-2">
    {pipe(
      connections,
      Array.map((connection) => (
        <li key={`${connection.type}/${connection.name}`}>
          <LinkedAccountLine connection={connection} />
        </li>
      )),
    )}
  </ul>
);

export { LinkedAccountList };
