import { isThisMonth } from './moneyFlows';
import { isAdjustment, isCashSpending, isIncome, isLoanDraw, isLoanPrincipal, isTransfer, sumAmount } from './transfers';
import { isTradeDebt } from './debtKind';
import { ledgerDateKey, ledgerTodayKey } from './ledgerDates';

/**
 * The Wallet is spendable money only:
 *   opening balance + received this month + post-cutover loan draws
 *   − consumption spending − money moved to reserves − loan principal repaid
 *   + reconciliation adjustments.
 *
 * Loan principal repaid is cash that left the Wallet. It is never spending, so it
 * is a leg of its own: a draw and its repayment on the same day cancel exactly.
 * Loan interest is consumption, so it reduces the Wallet as ordinary spending.
 *
 * The opening balance is the total of the most recent WalletSnapshot dated before
 * the first day of the current month. With no snapshot it is zero, and the card
 * says "Opening balance not set" instead of inventing a figure.
 *
 * A loan draw is cash he can spend, so it enters the Wallet, but it is never
 * income. Reserves balances held in the Ladder are never added, and money owed to
 * Shawn (DebtOwed) is never counted as cash. An adjustment is a reconciliation
 * correction: never income, never spending, only a correction to the Wallet.
 *
 * Free cash is the Wallet less what he still owes out on active loans, so the
 * card shows a real net position. A loan drawn before the cutover never entered
 * the Wallet, so those balances are reported separately (owedOutBeforeCutover) to
 * say plainly that the deduction includes money the Wallet never held.
 *
 * Everything is computed from the records on every call — nothing is stored.
 */
function activeLoansOf(loans = []) {
  return loans.filter((loan) => loan.status === 'active');
}

/** True when an active loan has a draw dated on or after the cutover, so its cash is in the Wallet. */
function drawnInWallet(loan, transactions = []) {
  const lender = String(loan?.lender || '').trim().toLowerCase();
  if (!lender) return false;
  return transactions.some((transaction) => isLoanDraw(transaction)
    && String(transaction.recipient || '').trim().toLowerCase() === lender);
}

function snapshotTotal(snapshot) {
  const stated = Number(snapshot?.total);
  if (Number.isFinite(stated)) return stated;
  return (Number(snapshot?.mpesa_balance) || 0)
    + (Number(snapshot?.mmf_balance) || 0)
    + (Number(snapshot?.mshwari_balance) || 0)
    + (Number(snapshot?.other_cash) || 0);
}

/** The most recent snapshot dated before this month began, if any. */
export function openingSnapshotOf(snapshots = [], now = new Date()) {
  const monthStart = `${ledgerTodayKey(now).slice(0, 7)}-01`;
  return snapshots
    .map((snapshot) => ({ snapshot, key: ledgerDateKey(snapshot.snapshot_date) }))
    .filter((item) => item.key && item.key < monthStart)
    .sort((a, b) => b.key.localeCompare(a.key))[0] || null;
}

export function computeWallet({ transactions = [], loans = [], debts = [], snapshots = [], now = new Date() } = {}) {
  const month = transactions.filter((transaction) => isThisMonth(transaction, now));

  const opening = openingSnapshotOf(snapshots, now);
  const openingBalance = opening ? snapshotTotal(opening.snapshot) : 0;

  const received = sumAmount(month.filter(isIncome));
  const draws = sumAmount(month.filter(isLoanDraw));
  // Goods bought on credit are spending in full, but no cash moved, so they are
  // never a leg of the Wallet.
  const spent = sumAmount(month.filter(isCashSpending));
  const moved = sumAmount(month.filter(isTransfer));
  const principalRepaid = sumAmount(month.filter(isLoanPrincipal));
  const adjustments = sumAmount(month.filter(isAdjustment));

  const balance = openingBalance + received + draws - spent - moved - principalRepaid + adjustments;

  const activeLoans = activeLoansOf(loans);
  // Owed out is every active balance: cash loans and goods taken on credit alike.
  const owedOut = activeLoans.reduce((total, loan) => total + (loan.balance || 0), 0);
  const owedOutTrade = activeLoans
    .filter(isTradeDebt)
    .reduce((total, loan) => total + (loan.balance || 0), 0);
  const owedOutBeforeCutover = activeLoans
    .filter((loan) => !isTradeDebt(loan) && !drawnInWallet(loan, transactions))
    .reduce((total, loan) => total + (loan.balance || 0), 0);

  const dueIn = debts
    .filter((debt) => debt.status === 'outstanding')
    .reduce((total, debt) => total + (debt.balance || 0), 0);

  return {
    openingBalance,
    openingSet: !!opening,
    openingDate: opening?.key || '',
    received,
    draws,
    spent,
    moved,
    principalRepaid,
    adjustments,
    wallet: balance,
    owedOut,
    // Balances whose draw predates the cutover, so that cash was never in the Wallet.
    owedOutBeforeCutover,
    // Goods received on credit: owed out, but no cash ever entered the Wallet.
    owedOutTrade,
    // Free cash is the Wallet less what he still owes out.
    freeCash: balance - owedOut,
    dueIn,
    monthLabel: now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
    moves: month
      .filter(isTransfer)
      .map((transaction) => ({ name: transaction.category || transaction.recipient || 'Reserves', amount: transaction.amount || 0 })),
  };
}

/**
 * Every leg of the Wallet, in the order the arithmetic runs, so each figure on
 * the card and in the breakdown can be traced to the total.
 */
export function walletLegs(wallet) {
  const legs = [
    {
      key: 'openingBalance',
      label: 'Opening balance',
      value: wallet.openingBalance,
      sign: 'plus',
      tone: 'text-foreground',
      note: 'Your most recent snapshot from before this month began. Zero until you set one.',
    },
    {
      key: 'received',
      label: 'Received',
      value: wallet.received,
      sign: 'plus',
      tone: 'text-money-in',
      note: 'Money that reached you this month, deposits included.',
    },
    {
      key: 'draws',
      label: 'Loan draws',
      value: wallet.draws,
      sign: 'plus',
      tone: 'text-money-in',
      note: 'Money borrowed since 19 November. Cash in the Wallet, never income.',
    },
    {
      key: 'spent',
      label: 'Spent in cash',
      value: wallet.spent,
      sign: 'minus',
      tone: 'text-money-out',
      note: 'Payments you consumed, loan interest included. Goods bought on credit count as spending but never move the Wallet, so they are not here. Loan principal and loan draws are never spending.',
    },
    {
      key: 'moved',
      label: 'Moved to reserves',
      value: wallet.moved,
      sign: 'minus',
      tone: 'text-money-moved',
      note: 'Every Ladder line and move to Britam MMF, M-Shwari and similar. Kept, not spent.',
    },
    {
      key: 'principalRepaid',
      label: 'Repaid to loans',
      value: wallet.principalRepaid,
      sign: 'minus',
      tone: 'text-money-out',
      note: 'Loan principal repaid since 19 November. Cash out of the Wallet, never spending, never in a budget.',
    },
  ];

  if (wallet.adjustments) {
    legs.push({
      key: 'adjustments',
      label: 'Adjustments',
      value: wallet.adjustments,
      sign: wallet.adjustments < 0 ? 'minus' : 'plus',
      tone: 'text-foreground',
      note: 'Reconciliation corrections. Never income, never spending, only the Wallet put right.',
    });
  }

  return legs;
}

/** A leg with its sign in front, e.g. "+ KES 57,900" or "− KES 1,347". */
export function legAmount(leg) {
  const value = leg?.value || 0;
  const flipped = value < 0 ? (leg.sign === 'plus' ? 'minus' : 'plus') : leg.sign;
  return `${flipped === 'plus' ? '+' : '−'} KES ${Math.abs(Math.round(value)).toLocaleString()}`;
}

/** Wallet figure tone: red when it is below zero, green when there is money left. */
export function walletTone(value) {
  if (value < 0) return 'text-money-out';
  if (value > 0) return 'text-money-in';
  return 'text-foreground';
}

export function kes(value = 0) {
  const rounded = Math.round(value || 0);
  const sign = rounded < 0 ? '-' : '';
  return `KES ${sign}${Math.abs(rounded).toLocaleString()}`;
}