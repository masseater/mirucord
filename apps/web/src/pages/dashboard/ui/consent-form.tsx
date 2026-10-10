import { Option } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { useConsentForm } from "#/pages/dashboard/model/use-consent-form";

import { ChannelOption } from "./channel-option";
import { ConsentResultMessage } from "./consent-result-message";
import { NoticeChannelPicker } from "./notice-channel-picker";

const TITLE = "読み取ってよいチャンネル";
const SUBMIT = { awaiting: "同意して取り込みを始める", granted: "読み取る範囲を保存する" } as const;
const NOTE = {
  awaiting:
    "同意すると、Bot が下で選んだチャンネルに「このサーバーの過去ログを mirucord が読み取ります」というお知らせを 1 回投稿します。",
  granted: "外したチャンネルは読み取りを止め、そのチャンネルの保存済みデータを削除します。",
} as const;

const ConsentForm = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => {
  const { selection, canSubmit, toggle, pickNotice, submit, mutation } = useConsentForm(settings);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{TITLE}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {settings.channels.map((channel) => (
          <ChannelOption
            key={channel.id}
            channel={channel}
            checked={selection.channelIds.includes(channel.id)}
            onToggle={toggle}
          />
        ))}
      </ul>
      {settings.consent.status === "awaiting" && (
        <NoticeChannelPicker
          channels={settings.channels}
          value={selection.noticeChannelId}
          onChoose={pickNotice}
        />
      )}
      <p>{NOTE[settings.consent.status]}</p>
      <button
        type="button"
        className="bg-primary text-primary-foreground self-start rounded px-4 py-2 disabled:opacity-50"
        disabled={!canSubmit}
        onClick={submit}
      >
        {SUBMIT[settings.consent.status]}
      </button>
      <ConsentResultMessage
        status={mutation.status}
        result={Option.fromUndefinedOr(mutation.data)}
      />
    </section>
  );
};

export { ConsentForm };
