import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isDemoMode, isLiveMode } from "@/lib/config";

// Microsoft Entra ID via Auth.js v5. Provider config is inferred from env:
//   AUTH_MICROSOFT_ENTRA_ID_ID / _SECRET / _ISSUER
// In demo mode no provider is registered and all requests are authorized.

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? "hv-demo-secret-not-for-production",
  providers: isLiveMode() ? [MicrosoftEntraID] : [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth: session }) {
      return isDemoMode() || !!session?.user;
    },
  },
});

export interface SessionUser {
  name: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    return { name: "Demo Executive", email: "demo@horizonview.app" };
  }
  const session = await auth();
  if (!session?.user) return null;
  return { name: session.user.name ?? "User", email: session.user.email ?? "" };
}
