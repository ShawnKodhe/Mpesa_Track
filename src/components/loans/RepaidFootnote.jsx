import { LOAN_INTEREST_CATEGORY, LOAN_PRINCIPAL_CATEGORY, sumAmount } from '@/lib/transfers';

const inCategory = (transaction, category) =>
  String(transaction?.category || '').trim().toLowerCase() === category;

/** Principal and interest paid in the records passed in, by category alone. */
export function repaymentTotals(transactions = []) {
  return {
    principal: sumAmount(transactions.filter((transaction) => inCategory(transaction, LOAN_PRINCIPAL_CATEGORY))),
    interest: sumAmount(transactions.filter((transaction) => inCategory(transaction, LOAN_INTEREST_CATEGORY))),
  };
}

/**
 * A footnote, not a verdict: what was repaid this month, in plain ink.
 * No colour, no animation, and no figure at all when nothing was repaid.
 */
export default function RepaidFootnote({ principal = 0, interest = 0 }) {
  const repaid = Number(principal) || 0;
  const interestPaid = Number(interest) || 0;

  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Repaid this month</p>

      {repaid > 0 ? (
        <>
          <p className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
            KES {repaid.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Principal repayments are not counted as spending.</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No debt repaid yet this month.</p>
      )}

      {interestPaid > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Interest paid: KES {interestPaid.toLocaleString()}</p>
      )}
    </div>
  );
}