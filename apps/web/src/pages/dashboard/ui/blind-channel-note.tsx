import { Array } from "effect";
import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest-messages/index.server";
import { MASCOT_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";

const EMPTY = `${MASCOT_NAME}が見られるチャンネルがありません`;

export const BlindChannelNote = ({
  channels,
}: Readonly<{ channels: readonly SettingsChannel[] }>): ReactNode =>
  Array.isReadonlyArrayEmpty(channels) && (
    <IconLine icon="hidden" tone="strong">
      {EMPTY}
    </IconLine>
  );
