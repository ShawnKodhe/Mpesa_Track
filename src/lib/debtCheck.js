import { ledgerDateKey, ledgerTodayKey } from './ledgerDates';
import { isTradeDebt } from './debtKind';

/**
 * The debt check reads the ledger against the debt records, in two separate
 * books:
 *
 *   Cash loans    — money that actually arrived. Read against the draws and the
 *                   principal repayments, so a draw with no loan, or a balance
 *                   that disagrees with the ledger, is flagged.
 *   Goods on credit — trade debts: goods received and not paid for. No cash ever
 *                   arrived, so these are never counted as money received and are
 *                   never validated against a draw.
 *
 * Interest is spending and never touches a balance, so only "loan principal"
 * records count as repaid.
 */
const catKey = (transaction) => String(transaction?.category || '').trim().toLowerCase();
const lenderKey = (name) => String(name || '').trim().toLowerCase();

function daysBetween(fromKey, toKey) {
  if (!fromKey || !toKey) return null;
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000));
}

function earliest(first, next) {
  if (!next) return first;
  if (!first) return next;
  return next < first ? next : first;
}

export function buildDebtCheck({ loans = [], transactions = [], today = ledgerTodayKey() } = {}) {
  const draws = transactions.filter((transaction) => transaction.type === 'loan');
  const principals = transactions.filter((transaction) => catKey(transaction) === 'loan principal');
  const interests = transactions.filter((transaction) => catKey(transaction) === 'loan interest');
  const creditPurchases = transactions.filter((transaction) => transaction.type === 'credit_purchase');

  /* ---------------------------------------------- cash loans, against the ledger */
  const byLender = new Map();
  const bucket = (name) => {
    const key = lenderKey(name);
    if (!byLender.has(key)) {
      byLender.set(key, {
        key,
        lender: String(name || '').trim() || 'Unknown',
        loans: [],
        drawn: 0,
        repaid: 0,
        interest: 0,
        activeCount: 0,
        activePrincipal: 0,
        activeBalance: 0,
        firstDraw: '',
      });
    }
    return byLender.get(key);
  };

  loans.filter((loan) => !isTradeDebt(loan)).forEach((loan) => {
    const entry = bucket(loan.lender);
    entry.loans.push(loan);
    if (loan.status === 'active') {
      entry.activeCount += 1;
      entry.activePrincipal += Number(loan.principal) || 0;
      entry.activeBalance += Number(loan.balance) || 0;
    }
  });

  draws.forEach((transaction) => {
    const entry = bucket(transaction.recipient);
    entry.drawn += Number(transaction.amount) || 0;
    entry.firstDraw = earliest(entry.firstDraw, ledgerDateKey(transaction.transaction_date));
  });

  principals.forEach((transaction) => {
    bucket(transaction.recipient).repaid += Number(transaction.amount) || 0;
  });

  interests.forEach((transaction) => {
    bucket(transaction.recipient).interest += Number(transaction.amount) || 0;
  });

  const cashRows = [...byLender.values()]
    .filter((entry) => entry.activeCount > 0 || entry.drawn > 0)
    .map((entry) => ({
      key: entry.key,
      lender: entry.lender,
      drawn: entry.activeCount > 0 ? entry.activePrincipal : entry.drawn,
      repaid: entry.repaid,
      balance: entry.activeBalance,
      interest: entry.interest,
      activeCount: entry.activeCount,
      days: daysBetween(entry.firstDraw, today),
    }))
    .sort((a, b) => b.balance - a.balance || b.drawn - a.drawn);

  /* --------------------------------------- goods on credit, never read as cash */
  const bySupplier = new Map();
  const supplierBucket = (name) => {
    const key = lenderKey(name);
    if (!bySupplier.has(key)) {
      bySupplier.set(key, {
        key,
        lender: String(name || '').trim() || 'Unknown',
        loans: 0,
        principal: 0,
        goods: 0,
        activeCount: 0,
        activeBalance: 0,
        firstDate: '',
      });
    }
    return bySupplier.get(key);
  };

  loans.filter(isTradeDebt).forEach((loan) => {
    const entry = supplierBucket(loan.lender);
    entry.loans += 1;
    entry.principal += Number(loan.principal) || 0;
    entry.firstDate = earliest(entry.firstDate, ledgerDateKey(loan.created_date));
    if (loan.status === 'active') {
      entry.activeCount += 1;
      entry.activeBalance += Number(loan.balance) || 0;
    }
  });

  creditPurchases.forEach((transaction) => {
    const entry = supplierBucket(transaction.recipient);
    entry.goods += Number(transaction.amount) || 0;
    entry.firstDate = earliest(entry.firstDate, ledgerDateKey(transaction.transaction_date));
  });

  const tradeRows = [...bySupplier.values()]
    .filter((entry) => entry.activeCount > 0 || entry.goods > 0)
    .map((entry) => ({
      key: entry.key,
      lender: entry.lender,
      amount: entry.goods || entry.principal,
      balance: entry.activeBalance,
      activeCount: entry.activeCount,
      days: daysBetween(entry.firstDate, today),
    }))
    .sort((a, b) => b.balance - a.balance || b.amount - a.amount);

  /* ------------------------------------------------------------- validation */
  const issues = [];

  byLender.forEach((entry) => {
    if (entry.activeCount > 0 && entry.drawn === 0) {
      issues.push({
        key: `no-draw-${entry.key}`,
        problem: 'Active loan with no draw',
        detail: `${entry.lender} is owed ${Math.round(entry.activeBalance).toLocaleString()} but the ledger has no money-borrowed record for it. If the money never arrived, it is a trade debt instead.`,
      });
    }

    if (entry.drawn > 0 && entry.loans.length === 0) {
      issues.push({
        key: `no-loan-${entry.key}`,
        lender: entry.lender,
        problem: 'Draw with no loan record',
        detail: `${Math.round(entry.drawn).toLocaleString()} was drawn from ${entry.lender} but no loan record exists for it.`,
      });
    }

    if (entry.activeCount > 0) {
      const expected = entry.activePrincipal - entry.repaid;
      if (Math.abs(entry.activeBalance - expected) > 1) {
        issues.push({
          key: `balance-${entry.key}`,
          lender: entry.lender,
          problem: 'Balance disagrees with the ledger',
          detail: `${Math.round(entry.activeBalance).toLocaleString()} owed, but ${Math.round(entry.activePrincipal).toLocaleString()} drawn less ${Math.round(entry.repaid).toLocaleString()} repaid leaves ${Math.round(expected).toLocaleString()}.`,
        });
      }
    }
  });

  principals.forEach((transaction) => {
    const entry = byLender.get(lenderKey(transaction.recipient));
    if (!entry || !entry.firstDraw) return;
    const key = ledgerDateKey(transaction.transaction_date);
    if (key && key < entry.firstDraw) {
      issues.push({
        key: `early-${transaction.id}`,
        lender: entry.lender,
        problem: 'Repayment dated before its draw',
        detail: `A principal repayment on ${key} comes before the first draw on ${entry.firstDraw}.`,
      });
    }
  });

  bySupplier.forEach((entry) => {
    if (entry.goods > 0 && entry.loans === 0) {
      issues.push({
        key: `no-debt-${entry.key}`,
        lender: entry.lender,
        problem: 'Goods on credit with no debt record',
        detail: `${Math.round(entry.goods).toLocaleString()} of goods from ${entry.lender} are on credit but no debt record exists, so nothing is counted as owed out.`,
      });
    }
  });

  return { cashRows, tradeRows, issues };
}