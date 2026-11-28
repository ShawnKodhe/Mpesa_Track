import { supabase } from './supabase';
import {
  changePassword,
  completePasswordRecovery,
  getCurrentUser,
  resetPasswordRequest,
  signIn,
  setSecondaryEmail,
  signInWithGoogle,
  signOut,
  signUp,
  updateMe,
  verifySecondaryEmail,
} from './auth';

const TABLES = {
  Transaction: 'transactions',
  Budget: 'budgets',
  Loan: 'loans',
  DebtOwed: 'debts_owed',
  JarvisMessage: 'jarvis_messages',
  LadderContribution: 'ladder_contributions',
  LadderRung: 'ladder_rungs',
  LadderSettings: 'ladder_settings',
  Notification: 'notifications',
  Reconciliation: 'reconciliations',
  WalletSnapshot: 'wallet_snapshots',
};

const FUNCTIONS = {
  loanLedger: 'loan-ledger',
  jarvisChat: 'jarvis-chat',
  jarvisAct: 'jarvis-act',
  jarvisSpeak: 'jarvis-speak',
  usageStats: 'usage-stats',
  parseMpesa: 'parse-mpesa',
  checkBudgetThreshold: 'check-budget-threshold',
  ladderReminders: 'ladder-reminders',
  requestPasswordReset: 'request-password-reset',
  setSecondaryEmail: 'set-secondary-email',
  verifySecondaryEmail: 'verify-secondary-email',
};

const FIELD_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const OWNER_FILTERS = new Set(['created_by', 'created_by_id', 'owner_id']);

function tableFor(entity) {
  const table = TABLES[entity];
  if (!table) throw new Error(`Unknown entity: ${entity}`);
  return table;
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

function mapRow(row) {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(mapRow);
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function mapPayload(data) {
  if (Array.isArray(data)) return data.map(mapPayload);
  return Object.fromEntries(
    Object.entries(data || {})
      .filter(([, value]) => value !== undefined)
      .filter(([key]) => !OWNER_FILTERS.has(key) && !['created_date', 'updated_date'].includes(key))
      .map(([key, value]) => [FIELD_ALIASES[key] || key, value]),
  );
}

function applyOperator(query, column, operator, value) {
  switch (operator) {
    case '$ne': return query.neq(column, value);
    case '$gt': return query.gt(column, value);
    case '$gte': return query.gte(column, value);
    case '$lt': return query.lt(column, value);
    case '$lte': return query.lte(column, value);
    case '$in': return query.in(column, value);
    default: return query.eq(column, value);
  }
}

function applyFilter(query, filter = {}) {
  Object.entries(filter).forEach(([key, value]) => {
    // Ownership is enforced by row level security in Supabase.
    if (OWNER_FILTERS.has(key) || value === undefined || value === null) return;
    const column = FIELD_ALIASES[key] || key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([operator, operand]) => {
        if (operand !== undefined) applyOperator(query, column, operator, operand);
      });
    } else {
      query.eq(column, value);
    }
  });
  return query;
}

function parseSort(sort) {
  if (!sort) return null;
  const raw = typeof sort === 'string' ? sort : sort.sort;
  if (!raw) return null;
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;
  return { column: FIELD_ALIASES[field] || field, ascending: !descending };
}

async function selectRows(table, filter, sort, limit) {
  const options = sort && typeof sort === 'object' ? sort : {};
  const parsed = parseSort(sort);
  const rowLimit = typeof limit === 'number' ? limit : options.limit;

  let query = supabase.from(table).select('*');
  query = applyFilter(query, filter || {});
  if (parsed) query = query.order(parsed.column, { ascending: parsed.ascending });
  if (rowLimit) query = query.limit(rowLimit);

  return mapRow(unwrap(await query));
}

async function alertBudget(transactionId) {
  if (!transactionId) return;
  try {
    await functions.invoke('checkBudgetThreshold', { transaction_id: transactionId });
  } catch {
    // The alert must never block a successful ledger write.
  }
}

function collection(entity) {
  const table = tableFor(entity);

  return {
    async filter(filter = {}, sort, limit) {
      return selectRows(table, filter, sort, limit);
    },

    async list(sort, limit) {
      return selectRows(table, {}, sort, limit);
    },

    async get(id) {
      return mapRow(unwrap(await supabase.from(table).select('*').eq('id', id).maybeSingle()));
    },

    async create(data) {
      const row = unwrap(await supabase.from(table).insert(mapPayload(data)).select().single());
      const mapped = mapRow(row);
      if (entity === 'Transaction') void alertBudget(mapped.id);
      return mapped;
    },

    async bulkCreate(rows) {
      const payload = mapPayload(rows);
      if (payload.length === 0) return [];
      const created = mapRow(unwrap(await supabase.from(table).insert(payload).select()));
      if (entity === 'Transaction') {
        await Promise.allSettled(created.map((row) => alertBudget(row.id)));
      }
      return created;
    },

    async update(id, patch) {
      return mapRow(unwrap(await supabase.from(table).update(mapPayload(patch)).eq('id', id).select().single()));
    },

    async bulkUpdate(updates = []) {
      return Promise.all(updates.map(({ id, ...patch }) => this.update(id, patch)));
    },

    async updateMany(filter = {}, operator = {}) {
      const patch = mapPayload(operator.$set || operator);
      return mapRow(unwrap(await applyFilter(supabase.from(table).update(patch), filter).select()));
    },

    async delete(id) {
      unwrap(await supabase.from(table).delete().eq('id', id).select());
      return { id };
    },

    subscribe(callback) {
      let channel = null;
      let closed = false;

      void supabase.auth.getSession().then(({ data }) => {
        if (closed) return;
        const userId = data?.session?.user?.id;
        channel = supabase
          .channel(`${table}-${userId || 'public'}-changes`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              ...(userId ? { filter: `owner_id=eq.${userId}` } : {}),
            },
            (payload) => callback?.(payload),
          )
          .subscribe();
      });

      return () => {
        closed = true;
        if (channel) void supabase.removeChannel(channel);
      };
    },
  };
}

export const functions = {
  // Call sites use both `invoke(name, body)` and `invoke(name, { body })`.
  async invoke(name, options = {}) {
    const functionName = FUNCTIONS[name] || name;
    const hasBodyWrapper = Object.prototype.hasOwnProperty.call(options, 'body');
    const body = hasBodyWrapper ? options.body : options;
    const rest = hasBodyWrapper
      ? Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'body'))
      : {};
    return supabase.functions.invoke(functionName, { body, ...rest });
  },
};

export const storage = {
  async uploadFile({ file }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You are not signed in');

    const safeName = String(file.name || 'avatar')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-80);
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { file_url: data.publicUrl };
  },
};

export const api = {
  entities: Object.fromEntries(Object.keys(TABLES).map((entity) => [entity, collection(entity)])),
  functions,
  storage,
  auth: {
    me: getCurrentUser,
    updateMe,
    logout: (options) => signOut(options),
    redirectToLogin: (returnTo = '/') => {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    },
    loginViaEmailPassword: signIn,
    loginWithProvider: (_provider, returnTo) => signInWithGoogle(returnTo),
    changePassword,
    register: signUp,
    resetPasswordRequest,
    resetPassword: completePasswordRecovery,
    setSecondaryEmail,
    verifySecondaryEmail,
    // Supabase manages the session itself; this is kept for call-site compatibility.
    setToken: () => {},
  },
};

export default api;
