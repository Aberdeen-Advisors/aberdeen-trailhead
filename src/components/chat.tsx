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
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-hv-border bg-hv-panel">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-sm text-hv-muted">
              Ask about metrics, RAID items, decisions, or project documents. Answers are grounded
              in the Semantic Model, SharePoint Lists, and document search — with citations.
            </p>
            <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-hv-border px-3 py-1.5 text-xs text-hv-muted transition hover:border-hv-accent/50 hover:text-hv-text"
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
                m.role === "user" ? "bg-hv-accent text-white" : "border border-hv-border bg-hv-bg"
              }`}
            >
              {m.text}
              {m.route && m.route.length > 0 && (
                <div className="mt-2 text-[11px] text-hv-muted">Routed via: {m.route.join(" + ")}</div>
              )}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 border-t border-hv-border pt-2 text-[11px] text-hv-muted">
                  Sources:{" "}
                  {m.citations.map((c, j) => (
                    <span key={j}>
                      {c.source} — {c.detail}
                      {j < m.citations!.length - 1 ? "; " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-hv-muted">Ask Horizon is thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-hv-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Horizon about your portfolio…"
          className="flex-1 rounded-lg border border-hv-border bg-hv-bg px-4 py-2.5 text-sm outline-none placeholder:text-hv-muted focus:border-hv-accent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-hv-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
