import type { ReactNode } from "react";

import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const SCOPE = "あなたが Discord で読めるチャンネルのメッセージを読みます";
const ALLOW = "つなぐ";
const DENY = "やめる";
const FAILED = "つなげませんでした";

const ConsentActions = ({
  status,
  onAllow,
  onDeny,
}: Readonly<{
  status: "idle" | "pending" | "success" | "error";
  onAllow: () => void;
  onDeny: () => void;
}>): ReactNode => {
  const locked = status === "pending" || status === "success";
  return (
    <>
      <IconLine icon="visible" tone="muted">
        {SCOPE}
      </IconLine>
      <div className="flex flex-wrap gap-4">
        <PopButton tone="primary" disabled={locked} onClick={onAllow}>
          {ALLOW}
        </PopButton>
        <PopButton tone="danger" disabled={locked} onClick={onDeny}>
          {DENY}
        </PopButton>
      </div>
      {status === "error" && (
        <IconLine icon="alert" role="alert" tone="strong">
          {FAILED}
        </IconLine>
      )}
    </>
  );
};

export { ConsentActions };
