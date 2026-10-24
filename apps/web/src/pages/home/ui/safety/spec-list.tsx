import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { Embed } from "#/pages/home/ui/message/embed";
import { MASCOT_NAME } from "#/shared/config";

import { SpecField } from "./spec-field";

const SPECS = [
  {
    label: "Discord への操作",
    tags: ["読み取りのみ"],
    accent: false,
    detail: "",
  },
  {
    label: "見える範囲",
    tags: ["ロール", "チャンネル権限"],
    accent: false,
    detail: "",
  },
  {
    label: "メッセージ本文",
    tags: ["暗号化"],
    accent: true,
    detail: "",
  },
  {
    label: "ログイン",
    tags: ["Discord OAuth"],
    accent: false,
    detail: "メールアドレスは集めません",
  },
  {
    label: `${MASCOT_NAME}を外したとき`,
    tags: ["すぐ削除"],
    accent: true,
    detail: "",
  },
  {
    label: "ソースコード",
    tags: ["公開"],
    accent: false,
    detail: "自分の Cloudflare で同じものを動かせます",
  },
] as const;

const SpecList = (): ReactNode => (
  <Embed accent="border-lavender-deep">
    <dl className="grid gap-4 sm:grid-cols-2">
      {pipe(
        SPECS,
        Array.map((spec) => (
          <SpecField
            key={spec.label}
            label={spec.label}
            tags={spec.tags}
            accent={spec.accent}
            detail={spec.detail}
          />
        )),
      )}
    </dl>
  </Embed>
);

export { SpecList };
