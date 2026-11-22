import { corsHeaders, handleError, json, requireUser } from '../_shared/mod.ts';

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/user/subscription';
const BASE44_API = 'https://app.base44.com';
const BASE44_MONITORING = `${BASE44_API}/api/v1/monitoring`;

type Balance = {
  configured: boolean;
  remaining: number | null;
  used: number | null;
  limit: number | null;
  unit: string;
  label: string | null;
  resetAt: string | null;
  error: string | null;
};

const unavailable = (error: string, unit: string): Balance => ({
  configured: false,
  remaining: null,
  used: null,
  limit: null,
  unit,
  label: null,
  resetAt: null,
  error,
});

async function fetchJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text().catch(() => '');
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON bodies still have a status code we can report.
  }
  if (!response.ok) {
    const detail = String(body?.detail?.message || body?.message || body?.error?.message || '').slice(0, 240);
    const error = new Error(detail || `Upstream returned ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  return body;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function elevenLabsBalance(): Promise<Balance> {
  const key = Deno.env.get('ELEVENLABS_API_KEY');
  if (!key) return unavailable('ElevenLabs key is not set', 'characters');

  try {
    const data = await fetchJson(ELEVENLABS_URL, { 'xi-api-key': key });
    const used = numberOrNull(data?.character_count);
    const limit = numberOrNull(data?.character_limit);
    const resetUnix = numberOrNull(data?.next_character_count_reset_unix);
    return {
      configured: true,
      remaining: used !== null && limit !== null ? Math.max(0, limit - used) : null,
      used,
      limit,
      unit: 'characters',
      label: data?.tier ? String(data.tier) : null,
      resetAt: resetUnix ? new Date(resetUnix * 1000).toISOString() : null,
      error: null,
    };
  } catch (error: any) {
    const detail = String(error?.message || '');
    const status = Number(error?.status || 0);
    let message = detail;
    if (status === 401 || detail.toLowerCase().includes('api key')) {
      message = 'ElevenLabs key is invalid — use the full key starting with sk_';
    } else if (status === 429) {
      message = 'ElevenLabs rate limit reached';
    }
    return { ...unavailable(message, 'characters'), configured: true };
  }
}

async function resolveWorkspaceId(token: string): Promise<string | null> {
  const configured = Deno.env.get('BASE44_WORKSPACE_ID');
  if (configured) return configured;

  const apps = await fetchJson(`${BASE44_API}/api/apps?fields=id,name,slug,organization_id`, {
    Authorization: `Bearer ${token}`,
  });
  if (!Array.isArray(apps)) return null;
  const appId = Deno.env.get('BASE44_APP_ID');
  const app = (appId && apps.find((item) => item?.id === appId)) || apps.find((item) => item?.organization_id);
  return app?.organization_id ? String(app.organization_id) : null;
}

async function base44Balance(): Promise<Balance> {
  const token = Deno.env.get('BASE44_API_KEY');
  if (!token) return unavailable('Base44 token is not set', 'credits');

  try {
    const workspaceId = await resolveWorkspaceId(token);
    if (!workspaceId) return { ...unavailable('Base44 workspace could not be found', 'credits'), configured: true };

    const data = await fetchJson(`${BASE44_MONITORING}/analytics/${workspaceId}`, {
      Authorization: `Bearer ${token}`,
    });
    // Backend functions and AI Gateway calls spend integration credits.
    const pool = data?.credit_pool?.integration ?? {};
    const messages = data?.credit_pool?.messages ?? {};
    return {
      configured: true,
      remaining: numberOrNull(pool.remaining),
      used: numberOrNull(pool.used),
      limit: numberOrNull(pool.limit),
      unit: 'credits',
      label: data?.credit_pool?.tier_display_name || String(data?.credit_pool?.tier || '') || null,
      resetAt: data?.credit_pool?.period_end ? String(data.credit_pool.period_end) : null,
      error: messages?.remaining === null && pool.remaining === null ? 'No credit balance was returned' : null,
    };
  } catch (error: any) {
    const status = Number(error?.status || 0);
    let message = String(error?.message || '');
    if (status === 403) {
      message = 'Base44 token needs workspace owner or admin access';
    } else if (status === 401) {
      message = 'Base44 token is invalid or read-only';
    }
    return { ...unavailable(message || 'Base44 credits could not be read', 'credits'), configured: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const [elevenlabs, base44] = await Promise.all([elevenLabsBalance(), base44Balance()]);
    return json({ elevenlabs, base44, generatedAt: new Date().toISOString() });
  } catch (error) {
    return handleError(error);
  }
});
