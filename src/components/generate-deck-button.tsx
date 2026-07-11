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
    <button
      onClick={generate}
      disabled={busy}
      className="rounded-lg bg-hv-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
    >
      {busy ? "Generating…" : label ?? "Generate SteerCo Deck"}
    </button>
  );
}
