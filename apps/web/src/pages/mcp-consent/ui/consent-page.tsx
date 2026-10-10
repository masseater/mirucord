import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { ConsentForm } from "./consent-form";
import { ConsentMissing } from "./consent-missing";

const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/mcp_/consent" });
  return Option.match(Option.fromUndefinedOr(clientId), {
    onNone: () => <ConsentMissing />,
    onSome: (id) => <ConsentForm clientId={id} />,
  });
};

export { ConsentPage };
