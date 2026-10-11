import { Option } from "effect";
import type { ReactNode } from "react";

import { dateFormat } from "#/pages/dashboard/model/date-format";
import type { ConnectedApp } from "#/shared/auth/index.server";

const CONNECTED_AT = "つないだ日時";
const UPDATED_AT = "更新日時";
const UNKNOWN = "不明";

const formatted = (epoch: number | null): string =>
  Option.match(Option.fromNullOr(epoch), {
    onNone: () => UNKNOWN,
    onSome: (value) => dateFormat.format(value),
  });

const ConnectedAppDates = ({ app }: Readonly<{ app: ConnectedApp }>): ReactNode => (
  <dl className="text-dc-muted grid w-full grid-cols-2 gap-y-1 text-sm">
    <dt className="font-bold">{CONNECTED_AT}</dt>
    <dd>{formatted(app.connectedAt)}</dd>
    <dt className="font-bold">{UPDATED_AT}</dt>
    <dd>{formatted(app.updatedAt)}</dd>
  </dl>
);

export { ConnectedAppDates };
