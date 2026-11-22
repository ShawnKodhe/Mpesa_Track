import { deleteRow, json, listRows } from './mod.ts';

export function clean(value: unknown): string {
  const text = String(value ?? '').trim();
  return text === 'null' || text === 'undefined' ? '' : text;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isDateKey(value: unknown): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
}

/** Ownership is checked against owner_id (and RLS backs it up). */
export async function loadOwnedRecord(client: any, table: string, id: unknown, userId: string) {
  const recordId = clean(id);
  if (!recordId) {
    return { record: null, response: json({ error: 'A record id is required' }, 400) };
  }
  const { data: record, error } = await client
    .from(table)
    .select('*')
    .eq('id', recordId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!record) {
    return { record: null, response: json({ error: 'That record no longer exists' }, 404) };
  }
  return { record, response: null };
}

export { deleteRow, listRows };
