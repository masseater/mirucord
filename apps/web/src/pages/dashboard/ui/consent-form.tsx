import { Option } from "effect";
import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { noticeChannels, readableChannels } from "#/pages/dashboard/model/consent-draft";
import { useConsentForm } from "#/pages/dashboard/model/use-consent-form";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { ConsentResultMessage } from "./consent-result-message";
import { NoticeChannelPicker } from "./notice-channel-picker";
import { ReadableChannelList } from "./readable-channel-list";

const SUBMIT = "取り込みに同意する";

const ConsentForm = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => {
  const { noticeChannelId, canSubmit, pickNotice, submit, mutation } = useConsentForm(settings);
  return (
    <Panel>
      <ReadableChannelList settings={settings} channels={readableChannels(settings)} />
      <NoticeChannelPicker
        channels={noticeChannels(settings)}
        value={noticeChannelId}
        onChoose={pickNotice}
      />
      <PopButton tone="primary" disabled={!canSubmit} onClick={submit}>
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
