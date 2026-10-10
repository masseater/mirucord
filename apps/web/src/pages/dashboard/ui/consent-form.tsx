import { Array, Option } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { noticeChannels, readableChannels } from "#/pages/dashboard/model/consent-draft";
import { useConsentForm } from "#/pages/dashboard/model/use-consent-form";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { ConsentResultMessage } from "./consent-result-message";
import { NoticeChannelPicker } from "./notice-channel-picker";
import { ReadableChannelList } from "./readable-channel-list";

const TITLE = "Bot が見られるチャンネル";
const EMPTY = "Bot が見られるチャンネルがまだありません。";
const NOTE = "同意すると、選んだチャンネルにお知らせを 1 回投稿します。";
const SUBMIT = "同意して取り込みを始める";

const ConsentForm = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => {
  const { noticeChannelId, canSubmit, pickNotice, submit, mutation } = useConsentForm(settings);
  const readable = readableChannels(settings);
  return (
    <Panel>
      <h2 className="text-xl font-black">{TITLE}</h2>
      <ReadableChannelList channels={readable} />
      {!Array.isReadonlyArrayNonEmpty(readable) && <p className="font-bold">{EMPTY}</p>}
      <NoticeChannelPicker
        channels={noticeChannels(settings)}
        value={noticeChannelId}
        onChoose={pickNotice}
      />
      <p className="text-ink-soft text-sm">{NOTE}</p>
      <PopButton tone="grape" disabled={!canSubmit} onClick={submit}>
        {SUBMIT}
      </PopButton>
      <ConsentResultMessage
        status={mutation.status}
        result={Option.fromUndefinedOr(mutation.data)}
      />
    </Panel>
  );
};

export { ConsentForm };
