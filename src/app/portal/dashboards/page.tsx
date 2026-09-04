import { redirect } from "next/navigation";

// Dashboards merged into /portal/reports — the two pages both answered "where
// do I see this?" and overlapped. Kept as a redirect so existing links and
// bookmarks still land somewhere sensible.
export default function DashboardsPage() {
  redirect("/portal/reports");
}
