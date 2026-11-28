/** The ledger changes Jarvis is allowed to propose and carry out. */

import { isReserveDestination } from './reserves.ts';

export const ACTION_TYPES = [
  'move_to_reserves',
  'create_transaction',
  'update_transaction',
  'delete_transaction',
  'update_budget',
  'create_budget',
  'create_contribution',
  'create_loan',
  'update_loan',
  'create_receivable',
  'update_receivable',
] as const;

export const TRANSACTION_TYPES = [
  'sent', 'received', 'payment', 'withdrawal', 'deposit', 'airtime', 'transfer',
  'credit_purchase', 'loan', 'adjustment',
];

export const CATEGORIES = [
  'food', 'transport', 'utilities', 'rent', 'entertainment', 'health', 'education',
  'reserves', 'airtime', 'shopping', 'family', 'business', 'other',
  'loan principal', 'loan interest', 'loan repayment',
  'Ladder: Buffer floor', 'Ladder: Emergency fund', 'Ladder: Debt freedom',
  'Ladder: Investments', 'Ladder: Big goal',
];

const text = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const positive = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const numberOr = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
};
const dateOr = (value: unknown, fallback: string) => {
  const raw = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
};
const oneOf = (value: unknown, allowed: readonly string[]) => {
  const raw = text(value, 80).toLowerCase();
  return allowed.find((item) => item.toLowerCase() === raw) ?? null;
};

// "Savings" is the old name for reserves. Keep accepting it so older phrasing
// still lands in the same place, and preserve custom Ladder rung labels.
const CATEGORY_ALIASES: Record<string, string> = { savings: 'reserves' };
const categoryOf = (value: unknown) => {
  const raw = text(value, 80);
  if (/^ladder:\s*\S/i.test(raw)) {
    return `Ladder: ${raw.replace(/^ladder:\s*/i, '').trim().slice(0, 72)}`;
  }
  return oneOf(raw, CATEGORIES) || CATEGORY_ALIASES[raw.toLowerCase()] || null;
};

/** Everything that reaches a write path is copied field by field. */
export function sanitizeAction(raw: any, today: string) {
  if (!raw || typeof raw !== 'object') return null;
  const type = oneOf(raw.type, ACTION_TYPES);
  if (!type) return null;
  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : {};
  const clean: Record<string, unknown> = {};
  let summary = text(raw.summary, 240) || `${type.replaceAll('_', ' ')}.`;

  switch (type) {
    case 'move_to_reserves': {
      const amount = positive(payload.amount ?? payload.value);
      if (!amount) return null;
      clean.amount = amount;
      clean.rung_id = text(payload.rung_id, 80);
      clean.recipient = text(payload.recipient ?? payload.destination ?? payload.rung_name, 160);
      clean.category = categoryOf(payload.category) || 'reserves';
      clean.description = text(payload.description ?? payload.note, 500);
      clean.transaction_date = dateOr(payload.transaction_date ?? payload.date, today);
      break;
    }
    case 'create_transaction': {
      const amount = positive(payload.amount ?? payload.value);
      if (!amount) return null;
      clean.type = oneOf(payload.type, TRANSACTION_TYPES) || 'sent';
      clean.amount = amount;
      clean.recipient = text(payload.recipient ?? payload.merchant ?? payload.lender, 160);
      clean.category = categoryOf(payload.category) || 'other';
      clean.description = text(payload.description ?? payload.note, 500);
      clean.transaction_date = dateOr(payload.transaction_date ?? payload.date, today);
      clean.mpesa_ref = text(payload.mpesa_ref, 80);
      // Reserve wording must land as a transfer: it is kept money, never income
      // or spending, and the Wallet must see the cash leave spendable funds.
      if (isReserveDestination(clean)) clean.type = 'transfer';
      break;
    }
    case 'update_transaction': {
      clean.id = text(payload.id ?? payload.transaction_id, 80);
      if (!clean.id) return null;
      if (payload.amount !== undefined) {
        const amount = positive(payload.amount);
        if (!amount) return null;
        clean.amount = amount;
      }
      for (const key of ['recipient', 'description', 'mpesa_ref'] as const) {
        if (payload[key] !== undefined) clean[key] = text(payload[key], 500);
      }
      if (payload.type !== undefined) clean.type = oneOf(payload.type, TRANSACTION_TYPES) || undefined;
      if (payload.category !== undefined) clean.category = categoryOf(payload.category) || undefined;
      if (payload.transaction_date !== undefined || payload.date !== undefined) {
        clean.transaction_date = dateOr(payload.transaction_date ?? payload.date, today);
      }
      break;
    }
    case 'delete_transaction': {
      clean.id = text(payload.id ?? payload.transaction_id, 80);
      if (!clean.id) return null;
      break;
    }
    case 'create_budget':
    case 'update_budget': {
      if (type === 'update_budget') clean.id = text(payload.id ?? payload.budget_id, 80);
      const amount = positive(payload.amount ?? payload.limit);
      if (!amount && type === 'create_budget') return null;
      if (amount) clean.amount = amount;
      clean.category = categoryOf(payload.category) || 'other';
      clean.period = oneOf(payload.period, ['weekly', 'monthly']) || 'monthly';
      if (payload.is_necessity !== undefined) clean.is_necessity = Boolean(payload.is_necessity);
      if (payload.active !== undefined) clean.active = Boolean(payload.active);
      break;
    }
    case 'create_contribution': {
      const amount = positive(payload.amount);
      if (!amount) return null;
      clean.amount = amount;
      clean.rung_id = text(payload.rung_id, 80);
      clean.contribution_date = dateOr(payload.contribution_date ?? payload.date, today);
      clean.source = oneOf(payload.source, ['manual', 'budget', 'auto']) || 'manual';
      clean.note = text(payload.note, 500);
      break;
    }
    case 'create_loan': {
      const amount = positive(payload.principal ?? payload.amount);
      if (!amount) return null;
      clean.lender = text(payload.lender, 160);
      if (!clean.lender) return null;
      clean.principal = amount;
      clean.balance = amount;
      clean.debt_type = oneOf(payload.debt_type, ['cash_loan', 'trade_debt']) || 'cash_loan';
      clean.interest_rate = numberOr(payload.interest_rate);
      clean.installment_amount = numberOr(payload.installment_amount);
      clean.frequency = oneOf(payload.frequency, ['one_time', 'weekly', 'biweekly', 'monthly']) || 'monthly';
      clean.next_payment_date = payload.next_payment_date ? dateOr(payload.next_payment_date, '') : null;
      clean.status = 'active';
      clean.description = text(payload.description ?? payload.note, 500);
      break;
    }
    case 'update_loan': {
      clean.id = text(payload.id ?? payload.loan_id, 80);
      if (!clean.id) return null;
      for (const key of ['lender', 'description'] as const) {
        if (payload[key] !== undefined) clean[key] = text(payload[key], 500);
      }
      for (const key of ['principal', 'balance', 'interest_rate', 'installment_amount'] as const) {
        if (payload[key] !== undefined) clean[key] = numberOr(payload[key]);
      }
      if (payload.status !== undefined) {
        clean.status = oneOf(payload.status, ['active', 'settled', 'paid_off']) || 'active';
      }
      if (payload.next_payment_date !== undefined) {
        clean.next_payment_date = dateOr(payload.next_payment_date, '');
      }
      break;
    }
    case 'create_receivable': {
      const amount = positive(payload.original_amount ?? payload.amount ?? payload.balance);
      if (!amount) return null;
      clean.debtor = text(payload.debtor ?? payload.person, 160);
      if (!clean.debtor) return null;
      clean.original_amount = amount;
      clean.balance = amount;
      clean.due_date = payload.due_date ? dateOr(payload.due_date, '') : null;
      clean.status = 'outstanding';
      clean.description = text(payload.description ?? payload.note, 500);
      break;
    }
    case 'update_receivable': {
      clean.id = text(payload.id ?? payload.receivable_id, 80);
      if (!clean.id) return null;
      for (const key of ['debtor', 'description'] as const) {
        if (payload[key] !== undefined) clean[key] = text(payload[key], 500);
      }
      for (const key of ['original_amount', 'balance'] as const) {
        if (payload[key] !== undefined) clean[key] = numberOr(payload[key]);
      }
      if (payload.status !== undefined) {
        clean.status = oneOf(payload.status, ['outstanding', 'settled']) || 'outstanding';
      }
      if (payload.due_date !== undefined) clean.due_date = dateOr(payload.due_date, '');
      break;
    }
    default:
      return null;
  }

  return { type, payload: clean, summary };
}
