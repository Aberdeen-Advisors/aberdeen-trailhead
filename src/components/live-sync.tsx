"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Keeps the server-rendered parts of a project page (KPIs, header status,
// weekly change summary) in step with edits made in the tables on the page.
// When a table saves, the page re-reads the database without a full reload,
// so anything you are typing in the tables is kept.
export function LiveSync({ projectId }: { projectId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if (d.projectId !== projectId) return;
      // Several quick edits in a row cause one refresh.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 600);
    };
    window.addEventListener("hv-data-changed", onChange);
    return () => {
      window.removeEventListener("hv-data-changed", onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [projectId, router]);

  return null;
}
