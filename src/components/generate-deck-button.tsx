"use client";

import { useState } from "react";

export function GenerateDeckButton({ projectId, label }: { projectId?: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const url = projectId
        ? `/api/reports/steering-deck?projectId=${encodeURIComponent(projectId)}`
        : "/api/reports/steering-deck";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "HorizonView_SteerCo.pptx";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Deck generation failed. Check the server logs.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={generate} disabled={busy} className="hv-btn-primary px-4 py-2 text-[0.82rem]">
      {busy ? (
        <>
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Generating…
        </>
      ) : (
        label ?? "Generate SteerCo Deck"
      )}
    </button>
  );
}
