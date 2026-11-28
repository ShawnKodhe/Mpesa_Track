import { corsHeaders, handleError, json, requireUser } from '../_shared/mod.ts';

/** Charlie — deep, confident male voice. Note: Default voices expire 31 Dec 2026. */
const CHARLIE_VOICE = 'IKne3meq5aSn9XLyUdCD';
/** Baxter — ElevenLabs' fallback voice when the chosen one is unavailable. */
const FALLBACK_VOICE = Deno.env.get('ELEVENLABS_FALLBACK_VOICE') || 'jSuBIjxMKhqIfb0wCK1F';
const PRIMARY_VOICE = Deno.env.get('ELEVENLABS_VOICE_EN') || CHARLIE_VOICE;
const SW_VOICE = Deno.env.get('ELEVENLABS_VOICE_SW') || PRIMARY_VOICE;
/** Plain speech needs no v3/v4 performance tags, so use the faster model. */
const MODEL = Deno.env.get('ELEVENLABS_MODEL') || 'eleven_multilingual_v2';
/** Short replies normally synthesise in a couple of seconds; keep retries bounded. */
const ATTEMPT_TIMEOUT_MS = 15_000;
const TOTAL_DEADLINE_MS = 25_000;

/** Accept real ElevenLabs ids, plus the legacy descriptive ids from older clients. */
function mapVoice(voiceId: unknown, text: string) {
  const raw = String(voiceId || '').trim();
  if (!raw || raw === 'auto') {
    return /\b(ni|na|kwa|sasa|leo|asante|habari|mpesa|pesa|sir)\b/i.test(text) ? SW_VOICE : PRIMARY_VOICE;
  }
  if (/^[a-zA-Z0-9]{20}$/.test(raw)) return raw;
  if (raw.toLowerCase().includes('sw') || raw.toLowerCase().includes('sulafat')) return SW_VOICE;
  return PRIMARY_VOICE;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Strip stale audio tags so the voice never reads bracketed cues aloud. */
const plainText = (text: string) => String(text || '').replace(/\[[^\]]{1,48}\]/g, '').trim();

const voiceSettings = () => ({
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  speed: 1,
  use_speaker_boost: true,
});

type TtsResult =
  | { ok: true; bytes: Uint8Array; voiceId: string; model: string }
  | { ok: false; status: number; detail: string };

async function synthesize(
  text: string,
  voiceId: string,
  key: string,
  timeoutMs: number,
): Promise<TtsResult> {
  let response: Response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: voiceSettings(),
      }),
      // A hung request must not consume the whole retry budget on its own.
      signal: AbortSignal.timeout(Math.max(1000, timeoutMs)),
    });
  } catch (error) {
    const name = (error as Error)?.name || '';
    return {
      ok: false,
      status: 0,
      detail: name === 'TimeoutError'
        ? 'timeout'
        : String((error as Error)?.message || 'network error').slice(0, 300),
    };
  }

  if (!response.ok) {
    const upstream = await response.text().catch(() => '');
    console.error('ElevenLabs error:', response.status, upstream.slice(0, 500));
    let detail = '';
    try {
      const parsed = JSON.parse(upstream);
      const raw = parsed?.detail;
      detail = typeof raw === 'string' ? raw : String(raw?.message || parsed?.message || '');
    } catch {
      // Some non-JSON upstream errors still have a useful status code.
    }
    return { ok: false, status: response.status, detail: detail.slice(0, 300) };
  }

  return { ok: true, bytes: new Uint8Array(await response.arrayBuffer()), voiceId, model: MODEL };
}

function isRecoverable(result: Extract<TtsResult, { ok: false }>) {
  const detail = result.detail.toLowerCase();
  // A bad model or plan will fail for every voice, so do not burn a retry.
  if (/model|plan|access|permission/.test(detail)) return false;
  // Status 0 is a timeout/network failure; 404 may just be an unavailable voice.
  return result.status === 0 || result.status === 404 || /voice|not found|timeout/i.test(detail);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const key = Deno.env.get('ELEVENLABS_API_KEY');
    if (!key) return json({ error: 'Speech is not configured for this project' }, 503);

    const body = await req.json().catch(() => ({}));
    // ElevenLabs is strictly opt-in: the browser only sends this flag when the
    // user switched "Speak replies aloud" on. Reject everything else before any
    // synthesis so stray calls can never spend characters.
    if (body?.speakEnabled !== true) {
      return json({ error: 'Speech is opt-in' }, 400);
    }
    const text = plainText(String(body?.text || ''));
    if (!text) return json({ error: 'Text is required' }, 400);
    if (text.length > 5000) return json({ error: 'That reply is too long to speak' }, 400);

    const requestedVoice = mapVoice(body.voiceId, text);
    const voices = [requestedVoice, FALLBACK_VOICE].filter((v, i, arr) => arr.indexOf(v) === i);

    const startedAt = Date.now();
    const remaining = () => TOTAL_DEADLINE_MS - (Date.now() - startedAt);
    let result: TtsResult | null = null;
    let firstDetail = '';
    let usedFallback = false;
    const deadVoices = new Set<string>();
    const tried: string[] = [];

    for (const voice of voices) {
      if (remaining() <= 1000) break;
      if (deadVoices.has(voice)) continue;

      const attemptStarted = Date.now();
      const current = await synthesize(
        text,
        voice,
        key,
        Math.min(ATTEMPT_TIMEOUT_MS, remaining()),
      );
      tried.push(`${voice}:${Date.now() - attemptStarted}ms`);
      if (current.ok) {
        result = current;
        usedFallback = voice !== requestedVoice;
        break;
      }
      if (!firstDetail) firstDetail = current.detail;
      const detail = current.detail.toLowerCase();
      if (/voice|not found/.test(detail)) deadVoices.add(voice);
      if (!isRecoverable(current)) break;
    }

    if (!result) {
      console.error('jarvisSpeak failed after', Date.now() - startedAt, 'ms:', tried.join(', '));
      return json({ error: 'Speech request failed', detail: firstDetail, elapsedMs: Date.now() - startedAt }, 502);
    }

    console.log('jarvisSpeak succeeded in', Date.now() - startedAt, 'ms:', tried.join(', '));

    return json({
      audio: toBase64(result.bytes),
      voiceId: result.voiceId,
      model: result.model,
      usedFallback,
      voiceError: usedFallback ? firstDetail : '',
      characters: text.length,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    return handleError(error);
  }
});
