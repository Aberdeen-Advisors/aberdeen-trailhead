export { auth as middleware } from "@/auth";

// The trAIlhead marketing site at "/" (and its assets) is public.
// Only the portal, the SAP transformation page, and their data APIs require Microsoft Entra sign-in.
// (/api/auth stays public for the sign-in flow; /api/cron is protected by CRON_SECRET.)
export const config = {
  matcher: [
    "/portal/:path*",
    "/sap-transformation.html",
    "/sap-transformation",
    "/api/ask/:path*",
    "/api/reports/:path*",
    "/api/podcast/:path*",
  ],
};
