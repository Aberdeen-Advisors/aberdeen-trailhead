export { auth as middleware } from "@/auth";

// The trAIlhead marketing site at "/" (and its assets) is public.
// Only the portal and its data APIs require Microsoft Entra sign-in.
// (/api/auth stays public for the sign-in flow; /api/cron is protected by CRON_SECRET.)
export const config = {
  matcher: ["/portal/:path*", "/api/ask/:path*", "/api/reports/:path*", "/api/podcast/:path*"],
};
