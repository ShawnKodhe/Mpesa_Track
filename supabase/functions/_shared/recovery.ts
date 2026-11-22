/** Helpers shared by the Resend-backed password recovery functions. */

export type RecoveryKind = 'reset' | 'secondary_verify';

export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function appUrl(): string {
  return (Deno.env.get('APP_URL') || 'https://mpesatrack.com').replace(/\/$/, '');
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function findUserByEmail(client: any, email: string): Promise<any | null> {
  const { data, error } = await client.rpc('mpesatrack_find_user_by_email', { p_email: email });
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : null;
}

/**
 * Returns false when this email has made too many requests recently.
 * Called with the service client; the request table is not exposed to users.
 */
export async function allowRequest(
  client: any,
  email: string,
  kind: RecoveryKind,
  max = 3,
  windowMinutes = 10,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await client
    .from('auth_email_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('kind', kind)
    .gte('requested_at', since);

  if (error) {
    console.error('Could not check the email request limit:', error.message);
    return false;
  }
  if ((count ?? 0) >= max) return false;

  const { error: insertError } = await client.from('auth_email_requests').insert({ email, kind });
  if (insertError) {
    console.error('Could not record the email request:', insertError.message);
    return false;
  }
  return true;
}
