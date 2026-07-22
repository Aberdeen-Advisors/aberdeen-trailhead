import { signOut } from "@/auth";

// POST /signout — clears the Auth.js session and redirects to the marketing landing page.
// Called from the SAP transformation static page and any other places that need a
// framework-agnostic sign-out endpoint.
export async function POST() {
  await signOut({ redirectTo: "/" });
}
