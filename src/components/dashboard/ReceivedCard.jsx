import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ReceivedBreakdown from './ReceivedBreakdown';
import { kes } from '@/lib/wallet';
import { describeLedgerRangeShort, entriesInRange, formatLedgerMonth, ledgerRange } from '@/lib/ledgerDates';
import { loanDrawsOf, receiptsOf, receivedGroups } from '@/lib/received';
import { sumAmount } from '@/lib/transfers';

/**
 * Money received this month, in the Wallet card's visual family. Reserves
 * transfers and loan draws are never part of the headline figure: a draw is
 * borrowed money, so it gets its own muted line instead.
 */
export default function ReceivedCard({ transactions = [], now = new Date() }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const range = ledgerRange('month', { now });
  const receipts = entriesInRange(receiptsOf(transactions), range);
  const total = sumAmount(receipts);
  const groups = receivedGroups(receipts);
  const draws = sumAmount(entriesInRange(loanDrawsOf(transactions), range));
  const monthLabel = formatLedgerMonth(range.start);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <button
          type="button"
          onClick={() => setShowBreakdown(true)}
          aria-label="Received this month, open the full list"
          className="w-full rounded-2xl p-5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Received
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {monthLabel} · {describeLedgerRangeShort(range)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-right font-heading text-3xl font-bold tabular-nums tracking-tight text-money-in sm:text-4xl">
            {kes(total)}
          </p>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            Money in this month, reserves and loans held apart
          </p>

          {groups.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
              {groups.map((group) => (
                <div key={group.key} className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">{group.label}</p>
                  <p className="mt-0.5 truncate text-right text-xs font-semibold tabular-nums text-foreground">
                    {kes(group.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {draws > 0 && (
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Loan draws: {kes(draws)}, borrowed and not income, so never counted above.
            </p>
          )}
        </button>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5">
          <span className="text-xs text-muted-foreground">
            {receipts.length === 1 ? '1 receipt' : `${receipts.length} receipts`}
          </span>
          <button
            type="button"
            onClick={() => setShowBreakdown(true)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Breakdown <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ReceivedBreakdown
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        receipts={receipts}
        monthLabel={monthLabel}
      />
    </>
  );
}