import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { DASHBOARD_PATH } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const FAILED = "Discord に移れませんでした";

const LinkConnectionsButton = ({ label }: Readonly<{ label: string }>): ReactNode => {
  const { mutate, status } = useMutation({
    mutationFn: () =>
      authClient.linkSocial({
        provider: "discord",
        scopes: ["connections"],
        callbackURL: DASHBOARD_PATH,
        fetchOptions: { throw: true },
      }),
  });
  const start = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <div className="flex flex-col items-start gap-2">
      <PopButton
        tone="primary"
        size="sm"
        disabled={status === "pending" || status === "success"}
        onClick={start}
      >
        {label}
      </PopButton>
      {status === "error" && (
        <IconLine icon="alert" role="alert" tone="strong" size="sm">
          {FAILED}
        </IconLine>
      )}
    </div>
  );
};

export { LinkConnectionsButton };
