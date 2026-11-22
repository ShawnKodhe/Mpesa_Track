/**
 * Two kinds of debt, and they behave differently in the Wallet.
 *   cash_loan  — money actually arrived, so the draw is cash in the Wallet.
 *   trade_debt — goods or services received on credit, no cash arrived, so it
 *                never touches the Wallet and never creates a cash inflow.
 * Records saved before the field existed have no debt_type and stay cash loans.
 */
export const CASH_LOAN = 'cash_loan';
export const TRADE_DEBT = 'trade_debt';

export const DEBT_KINDS = [
  { value: CASH_LOAN, label: 'Cash loan (money received)' },
  { value: TRADE_DEBT, label: 'Goods on credit (no cash received)' },
];

export function debtTypeOf(loan) {
  return loan?.debt_type === TRADE_DEBT ? TRADE_DEBT : CASH_LOAN;
}

export function isTradeDebt(loan) {
  return debtTypeOf(loan) === TRADE_DEBT;
}