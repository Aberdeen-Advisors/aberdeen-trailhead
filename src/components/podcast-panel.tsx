"use client";

import { useEffect, useRef, useState } from "react";

// Stage messages are time-based estimates: the API is a single long request
// (script ≈ 10s, then one TTS call per dialogue line).
const STAGES: Array<[number, string]> = [
  [0, "Gathering the latest project intelligence…"],
  [4, "Writing the two-host script with GPT-4o…"],
  [15, "Voicing Mark & Ellen with ElevenLabs…"],
  [45, "Stitching the audio segments…"],
  [70, "Almost there — finalizing the MP3…"],
];

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PodcastPanel({
  projectId,
  podcastUrl,
  enabled,
}: {
  projectId?: string;
  podcastUrl?: string | null;
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ message: string; script?: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("podcast.mp3");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (busy) {
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [busy]);

  const stage = STAGES.reduce((msg, [t, m]) => (elapsed >= t ? m : msg), STAGES[0][1]);

  async function build() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { projectId } : {}),
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
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-hv-accent/40 bg-hv-accent/5 px-3 py-2 text-sm font-medium text-hv-accent transition hover:bg-hv-accent/10 disabled:opacity-70"
      >
        {busy ? <Spinner /> : <span aria-hidden>🎙</span>}
        {busy ? "Rendering…" : "Build a Podcast Update"}
      </button>
      {busy && (
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-hv-muted">{stage}</p>
            <span className="shrink-0 font-mono text-xs text-hv-muted">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded bg-hv-border">
            <div
              className="h-1 rounded bg-hv-accent transition-all duration-1000"
              style={{ width: `${Math.min(95, Math.round((elapsed / 90) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-hv-muted">Typically takes about a minute — you can keep browsing, just don&apos;t close this page.</p>
        </div>
      )}
      {result && !busy && (
        <div className="rounded-lg border border-hv-border bg-hv-bg p-3">
          <p className="text-xs text-hv-muted">{result.message}</p>
          {result.script && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-hv-text">
              {result.script}
            </pre>
          )}
        </div>
      )}
      {!podcastUrl && !audioUrl && !result && !busy && (
        <p className="text-xs text-hv-muted">
          Generates a two-host executive audio briefing from the latest AI insights
          (GPT-4o script → ElevenLabs voices → downloadable MP3).
        </p>
      )}
    </div>
  );
}
