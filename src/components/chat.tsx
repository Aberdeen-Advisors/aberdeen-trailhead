"use client";

import { useRef, useState } from "react";
import type { AgentAnswer } from "@/lib/types";

interface Message {
  role: "user" | "agent";
  text: string;
  citations?: AgentAnswer["citations"];
  route?: string[];
}

const suggestions = [
  "How many red projects do we have?",
  "What decisions are overdue?",
  "Why is Project Phoenix delayed?",
  "What does the Alpha charter say about scope?",
  "What is our portfolio budget variance?",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(question: string) {
    if (!question.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as AgentAnswer & { error?: string };
      setMessages((m) => [
        ...m,
        data.error
          ? { role: "agent", text: `Something went wrong: ${data.error}` }
          : { role: "agent", text: data.answer, citations: data.citations, route: data.route },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "agent", text: "Request failed. Please try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="hv-card flex h-[calc(100vh-16rem)] min-h-[420px] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-hv bg-teal-tint text-xl">
              🧭
            </span>
            <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-hv-muted">
              Ask about metrics, RAID items, decisions, or project documents. Answers are grounded
              in the Semantic Model, SharePoint Lists, and document search — with citations.
            </p>
            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-hv-border bg-white px-3.5 py-1.5 text-xs font-medium text-hv-muted transition hover:-translate-y-0.5 hover:border-teal hover:text-teal-ink hover:shadow-hv"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-navy text-white"
                  : "border border-hv-border bg-hv-bg text-hv-text shadow-card"
              }`}
            >
              {m.text}
              {m.route && m.route.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-hv-subtle">
                    Routed via
                  </span>
                  {m.route.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-hv-border bg-white px-2 py-0.5 text-[10px] font-medium text-hv-muted"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2.5 border-t border-hv-border pt-2.5 text-[11px] leading-relaxed text-hv-muted">
                  <span className="font-semibold uppercase tracking-[0.08em] text-hv-subtle">Sources</span>
                  <ul className="mt-1 space-y-0.5">
                    {m.citations.map((c, j) => (
                      <li key={j} className="flex gap-1.5">
                        <span className="text-teal-ink">·</span>
                        <span>
                          <span className="font-medium text-hv-text">{c.source}</span> — {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-hv-muted">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-bright [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-bright [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-bright" />
            </span>
            Ask Horizon is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-hv-border bg-hv-bg p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Horizon about your portfolio…"
          className="flex-1 rounded-full border border-hv-border bg-white px-5 py-2.5 text-sm outline-none transition placeholder:text-hv-subtle focus:border-teal focus:shadow-[0_0_0_3px_rgba(68,176,177,0.15)]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="hv-btn-primary">
          Ask
        </button>
      </form>
    </div>
  );
}
