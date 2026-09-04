import Link from "next/link";
import { getSessionUser, signOut } from "@/auth";
import { isDemoMode, hvTier } from "@/lib/config";
import { NavTabs } from "@/components/nav-tabs";

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export default async function Nav() {
  const user = await getSessionUser();
  const demo = isDemoMode();
  const name = user?.name ?? "Guest";

  return (
    <header className="sticky top-0 z-40 shadow-[0_1px_0_rgba(9,55,95,0.06)]">
      {/* ── Brand band ───────────────────────────────────────────────────────
          Navy, matching the marketing hero. Uses the white logo lockups. */}
      <div className="bg-hv-hero">
        <div className="mx-auto flex max-w-[1320px] items-center gap-5 px-6 py-3">
          <Link href="/portal" className="flex shrink-0 items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aberdeen-logo-white.svg" alt="Aberdeen Advisors" className="h-6 w-auto" />
            <span aria-hidden="true" className="block h-7 w-px bg-white/25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/horizonview-logo-white.png" alt="HorizonView" className="h-8 w-auto" />
          </Link>

          <span className="hidden text-[0.72rem] font-light leading-tight text-white/55 lg:block">
            Project &amp; Portfolio
            <br />
            Intelligence Platform
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            {demo && (
              <span className="hidden items-center gap-1.5 rounded-full border border-teal/40 bg-teal/15 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-teal-tint sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-bright" />
                Demo Mode
              </span>
            )}
            <span className="hidden rounded-full border border-white/20 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/70 md:inline-flex">
              {hvTier()} tier
            </span>

            <span className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-bright text-[0.7rem] font-bold text-white">
                {initials(name)}
              </span>
              <span className="whitespace-nowrap text-[0.8rem] font-medium text-white">{name}</span>
            </span>

            {!demo && user && (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-full border border-white/25 px-3.5 py-1.5 text-[0.78rem] font-medium text-white/80 transition hover:border-teal hover:text-white"
                >
                  Sign out
                </button>
              </form>
            )}

            <Link
              href="/"
              className="hidden whitespace-nowrap rounded-full border border-white/25 px-3.5 py-1.5 text-[0.78rem] font-medium text-white/80 transition hover:border-teal hover:text-white sm:inline-flex"
            >
              <span aria-hidden="true" className="mr-1">
                ←
              </span>
              trAIlhead
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section tabs ─────────────────────────────────────────────────── */}
      <NavTabs />
    </header>
  );
}
