"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-runs the page's server queries on a timer while the tab is visible, so a
// page left open picks up each semantic-model refresh without a manual reload.
export function AutoRefresh({ everyMs = 5 * 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
