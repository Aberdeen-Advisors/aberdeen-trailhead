// ElevenLabs text-to-speech for executive podcast rendering.
// Two-host scripts ("JORDAN: ..." / "CASEY: ...") are voiced line by line
// with distinct voices and concatenated into a single MP3 buffer.

const API = "https://api.elevenlabs.io/v1";

export const hasElevenLabs = (): boolean => !!process.env.ELEVENLABS_API_KEY;

// Defaults are ElevenLabs premade voices; override per host via env.
const VOICES: Record<string, () => string> = {
  JORDAN: () => process.env.ELEVENLABS_VOICE_JORDAN ?? "pNInz6obpgDQGcFmaJgB", // Adam
  CASEY: () => process.env.ELEVENLABS_VOICE_CASEY ?? "21m00Tcm4TlvDq8ikWAM", // Rachel
};

export interface ScriptLine { speaker: string; text: string }

export function parseScript(script: string): ScriptLine[] {
  const out: ScriptLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    if (m && m[2].trim()) out.push({ speaker: m[1].toUpperCase(), text: m[2].trim() });
  }
  return out;
}

async function tts(text: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// Render the whole script. Sequential requests keep us inside rate limits;
// identically-encoded MP3 segments concatenate into a valid playable stream.
export async function renderPodcast(script: string, maxLines = 24): Promise<Buffer> {
  const lines = parseScript(script).slice(0, maxLines);
  if (!lines.length) throw new Error("Script contained no speakable lines.");
  const chunks: Buffer[] = [];
  for (const line of lines) {
    const voice = (VOICES[line.speaker] ?? VOICES.JORDAN)();
    chunks.push(await tts(line.text, voice));
  }
  return Buffer.concat(chunks);
}
