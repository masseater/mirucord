import { Array } from "effect";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";

const EMPTY = `${MASCOT_NAME}が見られるチャンネルがありません`;

const BlindChannelNote = ({
  channels,
}: Readonly<{ channels: readonly SettingsChannel[] }>): ReactNode =>
  Array.isReadonlyArrayEmpty(channels) && (
    <IconLine icon="hidden" tone="strong">
      {EMPTY}
    </IconLine>
  );

export { BlindChannelNote };
