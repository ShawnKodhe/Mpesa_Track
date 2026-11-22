import { corsHeaders, handleError, json, requireUser } from '../_shared/mod.ts';

/** Charlie — deep, confident, energetic Australian male. Note: Default voices expire 31 Dec 2026. */
const CHARLIE_VOICE = 'IKne3meq5aSn9XLyUdCD';
/** Lily — velvety British female, played as bored and faintly condescending. */
const LILY_VOICE = 'pFZP5JQG7iQjIQuC4Bku';
/** Baxter — "Dry Calm Aussie", ElevenLabs' official replacement for Charlie. */
const FALLBACK_VOICE = Deno.env.get('ELEVENLABS_FALLBACK_VOICE') || 'jSuBIjxMKhqIfb0wCK1F';
const PRIMARY_VOICE = Deno.env.get('ELEVENLABS_VOICE_EN') || CHARLIE_VOICE;
const SW_VOICE = Deno.env.get('ELEVENLABS_VOICE_SW') || PRIMARY_VOICE;
const MODEL_OVERRIDE = Deno.env.get('ELEVENLABS_MODEL') || '';
/** Short replies normally synthesise in a couple of seconds; keep retries bounded. */
const ATTEMPT_TIMEOUT_MS = 15_000;
const TOTAL_DEADLINE_MS = 25_000;
const KNOWN_MODELS = new Set(['eleven_v4', 'eleven_v3', 'eleven_multilingual_v2']);

type Persona = 'charlie' | 'lily';

/** The chosen voice decides the performance; a voice fallback keeps the persona. */
function personaFor(voiceId: string): Persona {
  return voiceId.toUpperCase() === LILY_VOICE.toUpperCase() ? 'lily' : 'charlie';
}

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

const supportsTags = (model: string) => /^eleven_v[34]/i.test(model);
const stripTags = (text: string) => text.replace(/\[[^\]]{1,48}\]/g, '').trim();

/** Lily's premade voice is listed for v2/v3, so prefer v3; Charlie gets v4. */
function modelsFor(persona: Persona) {
  const preferred = MODEL_OVERRIDE || (persona === 'lily' ? 'eleven_v3' : 'eleven_v4');
  const alternative = /^eleven_v4$/i.test(preferred) ? 'eleven_v3' : 'eleven_v4';
  return [preferred, alternative, 'eleven_multilingual_v2'].filter((m, i, all) => all.indexOf(m) === i);
}

/** Stable per-reply variation: the same line always gets the same performance. */
function seedOf(text: string) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

const pick = <T,>(items: T[], seed: number) => items[seed % items.length];

type Delivery = {
  openers: string[];
  leanIns: string[];
  pauses: string[];
  beats: string[];
  endings: string[];
  questionEndings: string[];
  neutralEndings: string[];
  softOpeners: string[];
  softPauses: string[];
  softEndings: string[];
};

/** Separate tag vocabularies so Charlie and Lily never borrow each other's mannerisms. */
const DELIVERY: Record<Persona, Delivery> = {
  charlie: {
    openers: ['[sarcastic]', '[deadpan, dry humor]', '[matter-of-fact]', '[confident]', '[leaning in conspiratorially]'],
    leanIns: ['[leaning in conspiratorially]', '[as if sharing a secret]', '[clears throat]', '[hmm]', '[exhales]'],
    pauses: ['[pause]', '[after a long pause]', '[hesitates]', '[hmm]'],
    beats: ['[lowering their voice]', '[as an afterthought]', '[hmm]', '[clears throat]'],
    endings: ['[chuckles]', '[snorts]', '[scoffs]', '[short disbelieving laugh]', '[exhales]'],
    questionEndings: ['[hmm]', '[chuckles]', '[as an afterthought]'],
    neutralEndings: ['[chuckles]', '[hmm]', '[exhales]', '[short disbelieving laugh]'],
    softOpeners: ['[clears throat]', '[long tired sigh]', '[hmm]', '[matter-of-fact]'],
    softPauses: ['[after a long pause]', '[hesitates]', '[hmm]'],
    softEndings: ['[sighs]', '[long tired sigh]', '[exhales]', '[hmm]'],
  },
  lily: {
    openers: ['[bored]', '[unimpressed]', '[monotone]', '[speaking as if this is beneath them]', '[with a faint sneer]'],
    leanIns: ['[scoffs]', '[barely concealing contempt]', '[as if explaining to a child]', '[does not look up]'],
    pauses: ['[long pause]', '[pause, unimpressed]', '[scoffs]', '[hmm]'],
    beats: ['[scoffs]', '[flatly]', '[as an afterthought]', '[with evident boredom]'],
    endings: ['[scoffs]', '[unimpressed sigh]', '[bored exhale]', '[dry chuckle]', '[rolls eyes]'],
    questionEndings: ['[scoffs]', '[unimpressed]', '[hmm]'],
    neutralEndings: ['[scoffs]', '[flatly]', '[unimpressed sigh]', '[bored exhale]'],
    softOpeners: ['[long tired sigh]', '[unimpressed]', '[flatly]', '[monotone]'],
    softPauses: ['[long pause]', '[unimpressed]', '[scoffs]'],
    softEndings: ['[unimpressed sigh]', '[flatly]', '[scoffs]', '[bored exhale]'],
  },
};

/**
 * Stage a reply like a person in the room: a presence cue, a beat between
 * clauses, a lowered aside, then a reaction. Tags are kept one per position
 * and separated by speech so v3/v4 performs them instead of reading them.
 */
export function styleSpeech(text: string, persona: Persona = 'charlie'): string {
  const clean = String(text || '').trim();
  if (!clean) return clean;

  const d = DELIVERY[persona];
  const lower = clean.toLowerCase();
  const seed = seedOf(clean);
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const tough = /\b(debt|broke|poor|failed|wrong|problem|mess|unfortunately|sorry|lost|gone|expensive|overdue|late)\b/.test(lower);
  const funny = /\b(haha|funny|joke|ridiculous|absurd|hilarious|genius|brilliant|classic|of course|sure|impressive)\b/.test(lower);
  const question = clean.includes('?');

  const opener = tough
    ? pick(d.softOpeners, seed)
    : question
      ? pick(d.leanIns, seed)
      : funny
        ? pick(d.leanIns, Math.floor(seed / 3))
        : pick(d.openers, seed);
  const pausePool = tough ? d.softPauses : d.pauses;
  let pause = pick(pausePool, Math.floor(seed / 7));
  if (pause === opener) pause = pick(pausePool, Math.floor(seed / 7) + 1);
  const beat = tough && persona === 'charlie' ? '[lowering their voice]' : pick(d.beats, Math.floor(seed / 11));
  const ending = tough
    ? pick(d.softEndings, seed)
    : funny
      ? pick(d.endings, Math.floor(seed / 5))
      : question
        ? pick(d.questionEndings, Math.floor(seed / 7))
        : pick(d.neutralEndings, Math.floor(seed / 17));

  let styled = `${opener} ${sentences[0]}`;
  if (sentences.length > 1) styled += ` ${pause} ${sentences[1]}`;
  if (sentences.length > 2) styled += ` ${beat} ${sentences.slice(2).join(' ')}`;
  return `${styled} ${ending}`;
}

function voiceSettings(persona: Persona) {
  return persona === 'lily'
    ? { stability: 0.2, similarity_boost: 0.72, style: 0.9, speed: 0.92, use_speaker_boost: true }
    : { stability: 0.3, similarity_boost: 0.68, style: 0.85, speed: 0.95, use_speaker_boost: true };
}

type TtsResult =
  | { ok: true; bytes: Uint8Array; voiceId: string; model: string }
  | { ok: false; status: number; detail: string };

async function synthesize(
  text: string,
  voiceId: string,
  model: string,
  key: string,
  persona: Persona,
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
        model_id: model,
        voice_settings: voiceSettings(persona),
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

  return { ok: true, bytes: new Uint8Array(await response.arrayBuffer()), voiceId, model };
}

function isRecoverable(result: Extract<TtsResult, { ok: false }>) {
  // Status 0 is a timeout/network failure: another combination may still work.
  if (result.status === 0) return true;
  return result.status === 404
    || /voice|model|access|permission|plan|not found|timeout/i.test(result.detail);
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
    const text = String(body?.text || '').trim();
    if (!text) return json({ error: 'Text is required' }, 400);
    if (text.length > 5000) return json({ error: 'That reply is too long to speak' }, 400);

    const requestedVoice = mapVoice(body.voiceId, text);
    const persona = personaFor(requestedVoice);
    const voices = [requestedVoice, FALLBACK_VOICE].filter((v, i, arr) => arr.indexOf(v) === i);
    const models = modelsFor(persona);
    const staged = styleSpeech(text, persona);
    const plain = stripTags(staged);

    // A combination that worked before goes first, so repeat replies need one
    // request instead of rediscovering the right model every time.
    const preferredVoice = String(body?.preferredVoice || '').trim();
    const preferredModel = String(body?.preferredModel || '').trim();
    const attempts: { voice: string; model: string }[] = [];
    const addAttempt = (voice: string, model: string) => {
      if (!attempts.some((a) => a.voice === voice && a.model === model)) attempts.push({ voice, model });
    };
    if (/^[a-zA-Z0-9]{20}$/.test(preferredVoice) && KNOWN_MODELS.has(preferredModel)) {
      addAttempt(preferredVoice, preferredModel);
    }
    for (const voice of voices) for (const model of models) addAttempt(voice, model);

    const startedAt = Date.now();
    const remaining = () => TOTAL_DEADLINE_MS - (Date.now() - startedAt);
    let result: TtsResult | null = null;
    let firstDetail = '';
    let usedFallback = false;
    const deadModels = new Set<string>();
    const deadVoices = new Set<string>();
    const tried: string[] = [];

    for (const attempt of attempts) {
      if (remaining() <= 1000) break;
      if (deadModels.has(attempt.model) || deadVoices.has(attempt.voice)) continue;

      const styled = supportsTags(attempt.model) ? staged : plain;
      const attemptStarted = Date.now();
      const current = await synthesize(
        styled,
        attempt.voice,
        attempt.model,
        key,
        persona,
        Math.min(ATTEMPT_TIMEOUT_MS, remaining()),
      );
      tried.push(`${attempt.voice}/${attempt.model}:${Date.now() - attemptStarted}ms`);
      if (current.ok) {
        result = current;
        usedFallback = attempt.voice !== requestedVoice;
        break;
      }
      if (!firstDetail) firstDetail = current.detail;
      const detail = current.detail.toLowerCase();
      // A model rejection applies to every voice; a missing voice applies to
      // every model of that voice. Skipping those saves several round trips.
      if (/model|plan|access|permission/.test(detail)) deadModels.add(attempt.model);
      else if (/voice|not found/.test(detail)) deadVoices.add(attempt.voice);
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
      persona,
      usedFallback,
      plainSpeech: !supportsTags(result.model),
      voiceError: usedFallback ? firstDetail : '',
      characters: text.length,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    return handleError(error);
  }
});
