"use client";

import { useState } from "react";

export function PodcastPanel({
  projectId,
  podcastUrl,
  enabled,
}: {
  projectId: string;
  podcastUrl: string | null;
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; script?: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("podcast.mp3");

  async function build() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const type = res.headers.get("Content-Type") ?? "";
      if (res.ok && type.includes("audio/mpeg")) {
        const blob = await res.blob();
        const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1];
        if (name) setFileName(name);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        setResult({ message: "Your executive podcast is ready — listen below or download the MP3." });
      } else {
        const data = await res.json();
        setResult(data.error ? { message: data.error, script: data.script } : { message: data.message, script: data.script });
      }
    } catch {
      setResult({ message: "Podcast request failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <p className="text-xs text-hv-muted">
        Podcast updates are an <span className="text-hv-accent2">Executive tier</span> add-on —
        AI-voiced weekly briefings. Contact Aberdeen to enable.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {(audioUrl || podcastUrl) && <audio controls src={audioUrl ?? podcastUrl ?? undefined} className="w-full" />}
      {audioUrl && (
        <a
          href={audioUrl}
          download={fileName}
          className="block w-full rounded-lg border border-hv-border px-3 py-2 text-center text-sm text-hv-muted transition hover:text-hv-text"
        >
          ⬇ Download MP3
        </a>
      )}
      <button
        onClick={build}
        disabled={busy}
        className="w-full rounded-lg border border-hv-accent/40 bg-hv-accent/5 px-3 py-2 text-sm font-medium text-hv-accent transition hover:bg-hv-accent/10 disabled:opacity-50"
      >
        {busy ? "Rendering audio… (about a minute)" : "🎙 Build a Podcast Update"}
      </button>
      {result && (
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3">
          <p className="text-xs text-hv-muted">{result.message}</p>
          {result.script && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-hv-text">
              {result.script}
            </pre>
          )}
        </div>
      )}
      {!podcastUrl && !audioUrl && !result && (
        <p className="text-xs text-hv-muted">
          Generates a two-host executive audio briefing from this project&apos;s latest AI insights
          (GPT-4o script → ElevenLabs voices → downloadable MP3).
        </p>
      )}
    </div>
  );
}
