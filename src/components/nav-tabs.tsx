"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/portal", label: "Portfolio" },
  { href: "/portal/transformation", label: "Transformation Program" },
  { href: "/portal/dashboards", label: "Dashboards" },
  { href: "/portal/reports", label: "Reports" },
  { href: "/portal/ask", label: "Ask Horizon" },
  { href: "/portal/live", label: "Solution in Action" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Portal sections" className="hv-scroll-x border-b border-hv-border bg-white">
      <ul className="mx-auto flex max-w-[1320px] items-stretch gap-1 px-6">
        {links.map((l) => {
          // /portal is only active on an exact match; the rest match their subtree
          // so a project detail page still highlights Portfolio.
          const active =
            l.href === "/portal"
              ? pathname === "/portal" || pathname.startsWith("/portal/projects")
              : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center whitespace-nowrap px-4 py-3.5 text-[0.82rem] font-medium transition ${
                  active ? "text-navy" : "text-hv-muted hover:text-navy"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition ${
                    active ? "bg-teal-bright" : "bg-transparent"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
