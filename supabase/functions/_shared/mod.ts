import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('The service role key is not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client that acts as the signed-in caller, so RLS still applies. */
export async function userContext(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('Supabase is not configured');

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { user, client };
}

export async function requireUser(req: Request) {
  const context = await userContext(req);
  if (!context) return { response: json({ error: 'Unauthorized' }, 401) } as const;
  return { ...context, response: null } as const;
}

type QueryOptions = {
  ownerId?: string;
  eq?: Record<string, string | number | boolean | null | undefined>;
  neq?: Record<string, string | number | boolean>;
  in?: Record<string, Array<string | number>>;
  gte?: Record<string, string | number>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
};

export async function listRows(client: any, table: string, options: QueryOptions = {}): Promise<any[]> {
  let query = client.from(table).select('*');
  if (options.ownerId) query = query.eq('owner_id', options.ownerId);
  for (const [column, value] of Object.entries(options.eq || {})) {
    if (value !== undefined && value !== null && value !== '') query = query.eq(column, value);
  }
  for (const [column, value] of Object.entries(options.neq || {})) query = query.neq(column, value);
  for (const [column, value] of Object.entries(options.in || {})) {
    if (value.length) query = query.in(column, value);
  }
  for (const [column, value] of Object.entries(options.gte || {})) query = query.gte(column, value);
  if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending !== false });
  const { data, error } = await query.limit(options.limit ?? 1000);
  if (error) throw error;
  return data ?? [];
}

export async function insertRow(client: any, table: string, row: Record<string, unknown>) {
  const { data, error } = await client.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function insertRows(client: any, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return [];
  const { data, error } = await client.from(table).insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateRow(client: any, table: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from(table).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(client: any, table: string, id: string) {
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
}

export function handleError(error: unknown): Response {
  return json({ error: error instanceof Error ? error.message : String(error) }, 500);
}
