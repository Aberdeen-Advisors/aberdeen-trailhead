import Link from "next/link";
import { getSessionUser, signOut } from "@/auth";
import { isDemoMode } from "@/lib/config";

const links = [
  { href: "/portal", label: "Portfolio" },
  { href: "/portal/dashboards", label: "Dashboards" },
  { href: "/portal/reports", label: "Reports" },
  { href: "/portal/ask", label: "Ask Horizon" },
  { href: "/portal/live", label: "Solution in Action" },
];

export default async function Nav() {
  const user = await getSessionUser();
  const demo = isDemoMode();
  return (
    <header className="sticky top-0 z-40 border-b border-hv-border bg-hv-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-hv-border px-2.5 py-1.5 text-xs font-medium text-hv-muted transition hover:border-hv-accent/50 hover:bg-hv-panel hover:text-hv-text"
          >
            <span aria-hidden="true">←</span> trAIlhead
          </Link>
          <Link href="/portal" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/horizonview-logo-dark.png" alt="HorizonView" className="h-8 w-auto" />
            <span className="hidden border-l border-hv-border pl-3 text-[11px] leading-tight text-hv-muted sm:block">
              by Aberdeen
              <br />
              Advisors
            </span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm text-hv-muted transition hover:bg-hv-panel hover:text-hv-text"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {demo && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              Demo Mode
            </span>
          )}
          <span className="text-sm text-hv-muted">{user?.name ?? "Guest"}</span>
          {!demo && user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-hv-border px-3 py-1.5 text-sm text-hv-muted transition hover:bg-hv-panel hover:text-hv-text"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
