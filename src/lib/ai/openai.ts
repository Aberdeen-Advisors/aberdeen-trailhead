// Thin fetch-based client supporting both Azure OpenAI and the OpenAI API.
// Used by Ask Horizon and report narrative generation in live mode.

export async function chatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { temperature?: number } = {}
): Promise<string> {
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let url: string;
  let headers: Record<string, string>;
  let model: string | undefined;

  if (azureKey && process.env.AZURE_OPENAI_ENDPOINT) {
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
    url = `${process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`;
    headers = { "api-key": azureKey, "Content-Type": "application/json" };
  } else if (openaiKey) {
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" };
    model = process.env.OPENAI_MODEL ?? "gpt-4o";
  } else {
    throw new Error("No AI credentials configured (AZURE_OPENAI_API_KEY or OPENAI_API_KEY).");
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...(model ? { model } : {}), messages, temperature: opts.temperature ?? 0.2 }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
