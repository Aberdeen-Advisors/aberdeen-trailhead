import Link from "next/link";
import { signIn } from "@/auth";
import { isDemoMode } from "@/lib/config";

export default function LoginPage() {
  const demo = isDemoMode();
  return (
    <main className="flex min-h-screen items-center justify-center bg-hv-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-hv-border bg-hv-panel p-10 text-center shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/horizonview-logo-dark.png" alt="HorizonView" className="mx-auto mb-4 h-12 w-auto" />
        <p className="text-sm text-hv-muted">Project Intelligence Platform</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aberdeen-logo-blue.svg" alt="by Aberdeen Advisors" className="mx-auto mt-3 h-6 w-auto opacity-80" />

        {demo ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              Demo mode — no Microsoft credentials configured. Sign-in is bypassed and mock
              portfolio data is shown. Set Entra ID variables in .env.local to go live.
            </div>
            <Link
              href="/portal"
              className="block w-full rounded-lg bg-hv-accent px-4 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              Continue to demo portal
            </Link>
          </div>
        ) : (
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/portal" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-hv-accent px-4 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              Sign in with Microsoft
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
