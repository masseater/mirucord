import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { ConsentForm } from "./consent-form.tsx";
import { ConsentMissing } from "./consent-missing.tsx";

export const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/mcp_/consent" });
  return Option.match(Option.fromUndefinedOr(clientId), {
    onNone: () => <ConsentMissing />,
    onSome: (id) => <ConsentForm clientId={id} />,
  });
};
