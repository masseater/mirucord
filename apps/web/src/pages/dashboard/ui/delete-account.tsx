import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { fixable } from "#/pages/dashboard/lib/feedback";
import { authClient } from "#/shared/auth";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

import { FeedbackLine } from "./feedback-line";

const SUMMARY = "アカウントを削除する";
const DETAIL = "元に戻せません";
const CONFIRM = "アカウントを削除";
const FAILED = fixable("signIn")("削除できませんでした");

const DeleteAccount = (): ReactNode => {
  const navigate = useNavigate();
  const { mutate, status } = useMutation({
    mutationFn: () => authClient.deleteUser({ fetchOptions: { throw: true } }),
    onSuccess: () => navigate({ to: "/", reloadDocument: true }),
  });
  const remove = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <details className="border-dc-line rounded-2xl border px-4 py-3">
      <summary className="cursor-pointer font-bold">{SUMMARY}</summary>
      <div className="mt-3">
        <IconLine icon="warning" tone="muted">
          {DETAIL}
        </IconLine>
      </div>
      <div className="mt-4">
        <PopButton
          tone="danger"
          size="sm"
          disabled={status === "pending" || status === "success"}
          onClick={remove}
        >
          {CONFIRM}
        </PopButton>
      </div>
      <div className="mt-3">
        <FeedbackLine feedback={FAILED.pipe(Option.filter(() => status === "error"))} />
      </div>
    </details>
  );
};

export { DeleteAccount };
