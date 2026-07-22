import Link from "next/link";
import { signIn } from "@/auth";
import { isDemoMode } from "@/lib/config";

type SearchParams = { callbackUrl?: string | string[] };

export default function LoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const demo = isDemoMode();

  const cbRaw = searchParams?.callbackUrl;
  const cb = Array.isArray(cbRaw) ? cbRaw[0] : cbRaw ?? "";
  const isSapContext = cb.includes("sap-transformation");

  const heading = isSapContext ? "SAP Transformation" : "HorizonView";
  const subheading = isSapContext
    ? "ECC → S/4HANA Program Delivery"
    : "Project Intelligence Platform";
  const logoSrc = isSapContext ? null : "/horizonview-logo-dark.png";
  const postSignInRedirect = isSapContext ? "/sap-transformation.html" : "/portal";

  return (
    <main className="flex min-h-screen items-center justify-center bg-hv-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-hv-border bg-hv-panel p-10 text-center shadow-lg">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt={heading} className="mx-auto mb-4 h-12 w-auto" />
        ) : (
          <h1 className="mb-2 text-2xl font-semibold text-hv-accent">{heading}</h1>
        )}
        <p className="text-sm text-hv-muted">{subheading}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aberdeen-logo-blue.svg" alt="by Aberdeen Advisors" className="mx-auto mt-3 h-6 w-auto opacity-80" />

        {demo ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              Demo mode — no Microsoft credentials configured. Sign-in is bypassed and mock
              portfolio data is shown. Set Entra ID variables in .env.local to go live.
            </div>
            <Link
              href={postSignInRedirect}
              className="block w-full rounded-lg bg-hv-accent px-4 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              {isSapContext ? "Continue to SAP Transformation" : "Continue to demo portal"}
            </Link>
          </div>
        ) : (
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: postSignInRedirect });
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
