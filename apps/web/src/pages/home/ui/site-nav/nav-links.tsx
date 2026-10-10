import type { ReactNode } from "react";

const LINKS = [
  { href: "#why", label: "課題" },
  { href: "#how", label: "仕組み" },
  { href: "#start", label: "導入" },
  { href: "#safety", label: "安全性" },
  { href: "#faq", label: "よくある質問" },
] as const;

const NavLinks = (): ReactNode => (
  <ul className="text-sumi-soft hidden gap-7 text-sm md:flex">
    {LINKS.map((link) => (
      <li key={link.href}>
        <a href={link.href} className="hover:text-shu no-underline">
          {link.label}
        </a>
      </li>
    ))}
  </ul>
);

export { NavLinks };
