import { String } from "effect";
import type { ReactNode } from "react";

const CategoryHeading = ({ name }: Readonly<{ name: string }>): ReactNode =>
  String.isNonEmpty(name) && (
    <h3 className="text-dc-muted text-xs font-black tracking-wide">{name}</h3>
  );

export { CategoryHeading };
