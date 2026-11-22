import { json } from './mod.ts';

/**
 * Server-to-server calls (Postgres trigger and pg_cron) arrive without a user
 * JWT, so the functions are registered with `verify_jwt = false` and guarded
 * by this shared secret instead.
 */
export function requireInternal(req: Request): Response | null {
  const expected = Deno.env.get('MPESATRACK_REPORT_SECRET');
  if (!expected) {
    return json({ error: 'MPESATRACK_REPORT_SECRET is not configured' }, 503);
  }
  const provided = req.headers.get('x-mpesatrack-secret') || '';
  if (provided !== expected) return json({ error: 'Unauthorized' }, 401);
  return null;
}
