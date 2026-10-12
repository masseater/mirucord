import { Array } from "effect";
import type { ReactNode } from "react";

import type { ConnectedApp } from "#/shared/auth/index.server";
import { Panel } from "#/shared/ui/panel";

import { ConnectedAppRow } from "./connected-app-row";

const TITLE = "つないでいるアプリ";

const ConnectedAppPanel = ({ apps }: Readonly<{ apps: readonly ConnectedApp[] }>): ReactNode =>
  Array.isReadonlyArrayNonEmpty(apps) && (
    <Panel>
      <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
      <ul className="flex flex-col gap-3">
        {apps.map((app) => (
          <ConnectedAppRow key={app.clientId} app={app} />
        ))}
      </ul>
    </Panel>
  );

export { ConnectedAppPanel };
