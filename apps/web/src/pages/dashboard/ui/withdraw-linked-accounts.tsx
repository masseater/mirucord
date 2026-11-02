import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { withdrawLinkedAccounts } from "#/pages/dashboard/api/linked-accounts";
import { useInvalidateLinkedAccounts } from "#/pages/dashboard/model/use-linked-account-form";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const WITHDRAW = "公開をやめる";
const FAILED = "やめられませんでした";

const WithdrawLinkedAccounts = (): ReactNode => {
  const refresh = useInvalidateLinkedAccounts();
  const { mutate, status } = useMutation({
    mutationFn: withdrawLinkedAccounts,
    onSuccess: refresh,
  });
  const withdraw = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <div className="flex flex-col items-start gap-2">
      <PopButton tone="danger" size="sm" disabled={status === "pending"} onClick={withdraw}>
        {WITHDRAW}
      </PopButton>
      {status === "error" && (
        <IconLine icon="alert" role="alert" tone="strong" size="sm">
          {FAILED}
        </IconLine>
      )}
    </div>
  );
};

export { WithdrawLinkedAccounts };
