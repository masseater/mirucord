import { Array, Option } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { readableChannels } from "#/pages/dashboard/model/consent-draft";
import { useConsentForm } from "#/pages/dashboard/model/use-consent-form";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { ConsentResultMessage } from "./consent-result-message";
import { NoticeChannelPicker } from "./notice-channel-picker";

const TITLE = "Bot が見られるチャンネル";
const SCOPE =
  "同意すると、下のチャンネルとそのスレッドを読み取ります。範囲を変えたいときは、Discord のチャンネル権限で mirucord の Bot の「チャンネルを見る」をオンかオフにしてください。管理画面での選び直しは要りません。";
const EMPTY =
  "Bot が見られるチャンネルがまだありません。Discord のチャンネル権限で Bot に閲覧を許可してください。";
const NOTE =
  "同意すると、Bot が選んだチャンネルに「このサーバーの過去ログを mirucord が読み取ります」というお知らせを 1 回投稿します。";
const SUBMIT = "同意して取り込みを始める";

const ConsentForm = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => {
  const { noticeChannelId, canSubmit, pickNotice, submit, mutation } = useConsentForm(settings);
  const readable = readableChannels(settings);
  return (
    <Panel>
      <h2 className="text-xl font-black">{TITLE}</h2>
      <p className="text-ink-soft text-sm leading-relaxed">{SCOPE}</p>
      <ul className="flex flex-wrap gap-2">
        {readable.map((channel) => (
          <li
            key={channel.id}
            className="border-ink bg-lavender rounded-full border-2 px-3 py-1 font-bold"
          >
            {`#${channel.name}`}
          </li>
        ))}
      </ul>
      {!Array.isReadonlyArrayNonEmpty(readable) && <p className="font-bold">{EMPTY}</p>}
      <NoticeChannelPicker channels={readable} value={noticeChannelId} onChoose={pickNotice} />
      <p className="text-ink-soft text-sm">{NOTE}</p>
      <PopButton tone="blurple" disabled={!canSubmit} onClick={submit}>
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
