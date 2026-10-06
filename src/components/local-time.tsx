"use client";

import { useEffect, useState } from "react";

// A timestamp shown in the viewer's own time zone (after hydration).
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      setText(d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    }
  }, [iso]);
  return <time dateTime={iso}>{text ?? "…"}</time>;
}
