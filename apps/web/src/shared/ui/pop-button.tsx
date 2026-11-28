import type { ReactNode } from "react";

import { popButtonVariants } from "./pop-variants.ts";
import type { PopSize, PopTone } from "./pop-variants.ts";

export const PopButton = (
  props: Readonly<{
    tone: PopTone;
    size?: PopSize;
    children: ReactNode;
  }> &
    (Readonly<{ href: string }> | Readonly<{ disabled: boolean; onClick: () => void }>),
): ReactNode => {
  const { tone, size = "md", children } = props;
  const className = popButtonVariants({ tone, size });
  if ("href" in props) {
    return (
      <a href={props.href} className={className}>
        {children}
      </a>
    );
  }
  const { disabled, onClick } = props;
  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};
