"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentAnswer } from "@/lib/types";

// Ask Horizon chat. The whole conversation is sent with each question so the
// agent can follow up ("what about Compass?"). The conversation is kept for
// this browser tab only (sessionStorage) and can be cleared with New chat.

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: AgentAnswer["citations"];
  route?: string[];
  error?: boolean;
}

const STORE_KEY = "hv-ask-horizon";

const suggestions = [
  "Which projects need my attention this week, and why?",
  "Which decisions are overdue and who owns them?",
  "What's driving Project Alpha's delay?",
  "Compare Phoenix and Compass",
  "What's due on Alpha's plan in the next 60 days?",
  "Where is the portfolio over budget?",
];

// Minimal, safe formatting for answers: paragraphs, "- " bullets, **bold**.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-navy">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Formatted({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="my-1.5 list-disc space-y-1 pl-5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      heading ? (
        <p key={`h${blocks.length}`} className="mt-2 font-semibold text-navy">
          {heading[1]}
        </p>
      ) : (
        <p key={`p${blocks.length}`} className="my-1">
          {inline(line)}
        </p>
      ),
    );
  }
  flush();
  return <div className="space-y-0.5">{blocks}</div>;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore this tab's conversation.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage unavailable */
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 30);
  }, [messages, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = (await res.json()) as AgentAnswer & { error?: string };
      setMessages((m) => [
        ...m,
        data.error || !res.ok
          ? { role: "assistant", text: data.error ?? "Something went wrong. Please try again.", error: true }
          : { role: "assistant", text: data.answer, citations: data.citations, route: data.route },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Request failed. Please try again.", error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="hv-card flex h-[calc(100vh-16rem)] min-h-[460px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-hv-border px-5 py-2.5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-hv-subtle">
          {messages.length ? `Conversation · ${messages.filter((m) => m.role === "user").length} question${messages.filter((m) => m.role === "user").length === 1 ? "" : "s"}` : "New conversation"}
        </span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            disabled={busy}
            className="rounded-full border border-hv-border px-3 py-1 text-[0.72rem] font-semibold text-navy transition hover:border-teal hover:text-teal-ink disabled:opacity-50"
          >
            + New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mt-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-hv bg-teal-tint text-xl">🧭</span>
            <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-hv-muted">
              Ask anything about your projects: status, risks, decisions, milestones, plans, budgets or documents.
              Ask Horizon looks up the live data for every project, keeps the conversation going, and shows what it
              checked.
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
                  ? "whitespace-pre-wrap bg-navy text-white"
                  : m.error
                    ? "border border-red-500/30 bg-red-50 text-hv-text"
                    : "border border-hv-border bg-hv-bg text-hv-text shadow-card"
              }`}
            >
              {m.role === "assistant" ? <Formatted text={m.text} /> : m.text}
              {m.route && m.route.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-hv-subtle">Looked at</span>
                  {m.route.map((r) => (
                    <span key={r} className="rounded-full border border-hv-border bg-white px-2 py-0.5 text-[10px] font-medium text-hv-muted">
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
            Ask Horizon is looking through your projects…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-hv-border bg-hv-bg p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={messages.length ? "Ask a follow-up…" : "Ask Horizon about your portfolio…"}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-hv-border bg-white px-5 py-2.5 text-sm outline-none transition placeholder:text-hv-subtle focus:border-teal focus:shadow-[0_0_0_3px_rgba(68,176,177,0.15)]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="hv-btn-primary">
          Ask
        </button>
      </form>
    </div>
  );
}
